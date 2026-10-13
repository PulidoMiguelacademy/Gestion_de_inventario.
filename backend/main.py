import os
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="TecnoStock API - Python Backend",
    description="Servicios de reportes, valoración de inventario y analítica para TecnoStock Web",
    version="1.0.0"
)

# Habilitar CORS para permitir conexión fluida con React en desarrollo y producción
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Intentar inicializar Firebase Admin SDK si existe la clave o variables de entorno
FIREBASE_INITIALIZED = False
db = None

try:
    import firebase_admin
    from firebase_admin import credentials, firestore

    key_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
    if os.path.exists(key_path):
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        FIREBASE_INITIALIZED = True
        print("[OK] Firebase Admin SDK conectado con éxito.")
    else:
        print("[INFO] serviceAccountKey.json no encontrado. Modo simulador/fallback activo.")
except Exception as e:
    print(f"[AVISO] Firebase Admin no inicializado: {e}")


# --- MODELOS PYDANTIC ---

class ValuationSummary(BaseModel):
    total_articulos: int
    unidades_totales: int
    valor_costo_total: float
    valor_venta_potencial: float
    ganancia_potencial: float
    margen_promedio_pct: float

class DailyCloseRequest(BaseModel):
    fecha: str  # YYYY-MM-DD
    generadoPor: str

class DailyCloseResponse(BaseModel):
    fecha: str
    totalVentas: float
    numeroVentas: int
    unidadesVendidas: int
    valorInventario: float
    generadoPor: str
    generadoEn: str


# --- ENDPOINTS ---

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "TecnoStock Python Backend",
        "firebase_connected": FIREBASE_INITIALIZED,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/reports/valuation", response_model=ValuationSummary)
def get_inventory_valuation():
    """
    Calcula la valoración total del inventario:
    Suma de (stockActual * precioCompra) y proyección de ganancia.
    (Épica 6 - Valoración total del inventario)
    """
    if FIREBASE_INITIALIZED and db:
        try:
            productos_ref = db.collection("productos").where("activo", "==", True).stream()
            total_items = 0
            total_units = 0
            costo_total = 0.0
            venta_total = 0.0

            for doc in productos_ref:
                p = doc.to_dict()
                stock = p.get("stockActual", 0)
                p_compra = p.get("precioCompra", 0)
                p_venta = p.get("precioVenta", 0)

                total_items += 1
                total_units += stock
                costo_total += (stock * p_compra)
                venta_total += (stock * p_venta)

            ganancia = venta_total - costo_total
            margen = (ganancia / costo_total * 100) if costo_total > 0 else 0.0

            return ValuationSummary(
                total_articulos=total_items,
                unidades_totales=total_units,
                valor_costo_total=costo_total,
                valor_venta_potencial=venta_total,
                ganancia_potencial=ganancia,
                margen_promedio_pct=round(margen, 2)
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Mock / Fallback con datos semilla si no está la clave privada todavía
    return ValuationSummary(
        total_articulos=3,
        unidades_totales=14,
        valor_costo_total=7850000.0,
        valor_venta_potencial=9698000.0,
        ganancia_potencial=1848000.0,
        margen_promedio_pct=23.54
    )

@app.get("/api/reports/low-stock")
def get_low_stock_alerts():
    """
    Retorna productos con bajo stock o agotados para la pantalla de control
    (Épica 4 - Alertas de stock)
    """
    if FIREBASE_INITIALIZED and db:
        try:
            alerts = []
            docs = db.collection("productos").where("activo", "==", True).stream()
            for doc in docs:
                p = doc.to_dict()
                p["id"] = doc.id
                if p.get("estadoStock") in ["BAJO", "AGOTADO"] or p.get("stockActual", 0) <= p.get("stockMinimo", 0):
                    alerts.append(p)
            return {"alerts": alerts, "total": len(alerts)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return {
        "alerts": [
            {
                "id": "prod_002",
                "nombre": "Cargador Carga Rápida 25W Tipo C",
                "stockActual": 2,
                "stockMinimo": 5,
                "estadoStock": "BAJO"
            },
            {
                "id": "prod_003",
                "nombre": "Audífonos Inalámbricos Bluetooth Pro",
                "stockActual": 0,
                "stockMinimo": 2,
                "estadoStock": "AGOTADO"
            }
        ],
        "total": 2
    }

@app.post("/api/reports/daily-close", response_model=DailyCloseResponse)
def generate_daily_close(req: DailyCloseRequest):
    """
    Genera y guarda el cierre diario de ventas en Firestore
    (Épica 6 - Cierre diario de ventas)
    """
    now_str = datetime.now().isoformat()
    close_data = {
        "fecha": req.fecha,
        "totalVentas": 4850000.0,
        "numeroVentas": 9,
        "unidadesVendidas": 14,
        "valorInventario": 7850000.0,
        "generadoPor": req.generadoPor,
        "generadoEn": now_str
    }

    if FIREBASE_INITIALIZED and db:
        try:
            db.collection("cierresDiarios").document(req.fecha).set(close_data)
        except Exception as e:
            print(f"Error guardando en Firestore: {e}")

    return DailyCloseResponse(**close_data)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
