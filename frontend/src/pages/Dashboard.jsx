import React, { useEffect, useState } from "react";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Truck, 
  PlusCircle, 
  ShoppingBag, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export default function Dashboard({ setActiveTab }) {
  const { profile, isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Escuchar productos en tiempo real
    const unsubProducts = onSnapshot(collection(db, "productos"), (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setLoading(false);
    }, (err) => {
      console.warn("Aviso productos:", err);
      setLoading(false);
    });

    // 2. Escuchar proveedores
    const unsubSuppliers = onSnapshot(collection(db, "proveedores"), (snapshot) => {
      const supps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSuppliers(supps);
    }, (err) => {
      console.warn("Aviso proveedores:", err);
    });

    // 3. Escuchar alertas
    const unsubAlerts = onSnapshot(collection(db, "alertas"), (snapshot) => {
      const alts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlerts(alts);
    }, (err) => {
      console.warn("Aviso alertas:", err);
    });

    return () => {
      unsubProducts();
      unsubSuppliers();
      unsubAlerts();
    };
  }, []);

  const parseNum = (val) => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const clean = String(val).replace(/\./g, "").replace(/,/g, ".");
    return parseFloat(clean) || 0;
  };

  const totalUnidades = products.reduce((acc, p) => acc + (p.stockActual || 0), 0);
  const valorInventario = products.reduce((acc, p) => acc + ((p.stockActual || 0) * parseNum(p.precioCompra)), 0);
  const prodsAlerta = products.filter(p => p.estadoStock === "BAJO" || p.estadoStock === "AGOTADO" || (p.stockActual <= p.stockMinimo));

  return (
    <div className="page-body">
      {/* Banner de Bienvenida */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "20px",
        padding: "26px 32px",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "28px"
      }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px 0" }}>
            {`¡Hola, ${profile?.nombre || "Colaborador"}! 👋`}
          </h2>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            {isAdmin 
              ? "Panel de Administrador: Control global de catálogo, usuarios y analítica en tiempo real."
              : "Panel de Operador: Registro de ventas, consulta de stock y recepción de mercancía."}
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={() => setActiveTab("products")}
        >
          <PlusCircle size={18} />
          Nuevo Producto
        </button>
      </div>

      {/* Grid de Métricas Principales */}
      <div className="metric-grid">
        <div className="card metric-card">
          <div>
            <span className="metric-label">Productos Registrados</span>
            <div className="metric-value">{products.length}</div>
          </div>
          <div className="metric-icon-box" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
            <Package size={26} />
          </div>
        </div>

        <div className="card metric-card">
          <div>
            <span className="metric-label">Unidades en Vitrina</span>
            <div className="metric-value">{totalUnidades}</div>
          </div>
          <div className="metric-icon-box" style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}>
            <ShoppingBag size={26} />
          </div>
        </div>

        <div className="card metric-card">
          <div>
            <span className="metric-label">Valoración Total (Costo)</span>
            <div className="metric-value">
              ${valorInventario.toLocaleString("es-CO")}
            </div>
          </div>
          <div className="metric-icon-box" style={{ backgroundColor: "#fdf4ff", color: "#a855f7" }}>
            <TrendingUp size={26} />
          </div>
        </div>

        <div className="card metric-card">
          <div>
            <span className="metric-label">Alertas de Stock</span>
            <div className="metric-value" style={{ color: prodsAlerta.length > 0 ? "#dc2626" : "#0f172a" }}>
              {prodsAlerta.length}
            </div>
          </div>
          <div className="metric-icon-box" style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
            <AlertTriangle size={26} />
          </div>
        </div>
      </div>

      {/* Sección de Alertas Críticas (Épica 4 - Alertas de stock) */}
      {prodsAlerta.length > 0 && (
        <div className="card" style={{ marginBottom: "28px", borderLeft: "5px solid #dc2626" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <ShieldAlert size={22} style={{ color: "#dc2626" }} />
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#991b1b", margin: 0 }}>
              Atención Inmediata: Productos con Stock Bajo o Agotado
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
            {prodsAlerta.map(p => (
              <div 
                key={p.id}
                style={{
                  backgroundColor: "#fff1f2",
                  border: "1px solid #fecdd3",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#9f1239", margin: "0 0 4px 0" }}>
                    {p.nombre}
                  </h4>
                  <p style={{ fontSize: "12px", color: "#be123c", margin: 0 }}>
                    {`Disponibles: `}<strong>{p.stockActual || 0}</strong>{` | Mínimo: ${p.stockMinimo || 3}`}
                  </p>
                </div>
                <span className={`badge ${p.stockActual === 0 ? "badge-agotado" : "badge-bajo"}`}>
                  {p.stockActual === 0 ? "AGOTADO" : "BAJO STOCK"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acceso Rápido a Módulos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        <div className="card">
          <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px" }}>Catálogo de Productos</h3>
          <p style={{ fontSize: "13.5px", color: "#64748b", marginBottom: "18px" }}>
            Consulta precios de compra y venta, códigos de barras y gestiona seriales de cada celular.
          </p>
          <button className="btn btn-secondary" onClick={() => setActiveTab("products")}>
            Ver Catálogo <ArrowRight size={16} />
          </button>
        </div>

        <div className="card" style={{ borderTop: "4px solid #2563eb" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px" }}>Historial de Movimientos (S7)</h3>
          <p style={{ fontSize: "13.5px", color: "#64748b", marginBottom: "18px" }}>
            Registra entradas con proveedor y seriales, ventas por escáner y audita el Kardex de movimientos.
          </p>
          <button className="btn btn-primary" onClick={() => setActiveTab("movements")}>
            Ir a Movimientos <ArrowRight size={16} />
          </button>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px" }}>Proveedores & Lotes</h3>
          <p style={{ fontSize: "13.5px", color: "#64748b", marginBottom: "18px" }}>
            Directorio de distribuidores oficiales (NIT, teléfonos y correos para pedidos y garantías).
          </p>
          <button className="btn btn-secondary" onClick={() => setActiveTab("suppliers")}>
            Ver Proveedores <ArrowRight size={16} />
          </button>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px" }}>Reportes Python (FastAPI)</h3>
          <p style={{ fontSize: "13.5px", color: "#64748b", marginBottom: "18px" }}>
            Ejecuta el cierre diario de ventas y calcula la valoración del inventario procesado en Python.
          </p>
          <button className="btn btn-secondary" onClick={() => setActiveTab("reports")}>
            Ver Reportes <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
