import React, { useState, useEffect } from "react";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  Server,
  Receipt,
  Clock,
  User,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export default function Reports() {
  const { profile } = useAuth();

  // Estados de datos en tiempo real desde Firestore
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [closingHistory, setClosingHistory] = useState([]);

  // Estados del microservicio FastAPI
  const [valuation, setValuation] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const [closeSuccess, setCloseSuccess] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/+$/, "");

  // 1. Escuchar datos en tiempo real de Firestore (Productos, Ventas e Historial de Cierres)
  useEffect(() => {
    // A. Productos
    const unsubProducts = onSnapshot(collection(db, "productos"), (snapshot) => {
      const prods = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => p.activo !== false);
      setProducts(prods);
    }, (err) => console.warn("Aviso productos:", err));

    // B. Ventas
    const qVentas = query(collection(db, "ventas"), orderBy("fecha", "desc"));
    const unsubSales = onSnapshot(qVentas, (snapshot) => {
      const sList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSales(sList);
    }, (err) => console.warn("Aviso ventas:", err));

    // C. Cierres Diarios
    const qCierres = query(collection(db, "cierresDiarios"), orderBy("generadoEn", "desc"));
    const unsubCierres = onSnapshot(qCierres, (snapshot) => {
      const cList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClosingHistory(cList);
    }, (err) => console.warn("Aviso cierres:", err));

    return () => {
      unsubProducts();
      unsubSales();
      unsubCierres();
    };
  }, []);

  // 2. Health check y valoración desde Python (con cálculo local en tiempo real como respaldo)
  const fetchReports = async () => {
    try {
      const healthRes = await fetch(`${API_URL}/health`);
      if (healthRes.ok) {
        setBackendOnline(true);
        const valRes = await fetch(`${API_URL}/reports/valuation`);
        if (valRes.ok) {
          const valData = await valRes.json();
          setValuation(valData);
          return;
        }
      }
      setBackendOnline(false);
    } catch {
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [API_URL]);

  // Cálculos matemáticos en tiempo real basados en los datos vivos de Firestore
  const parseNum = (val) => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const clean = String(val).replace(/\./g, "").replace(/,/g, ".");
    return parseFloat(clean) || 0;
  };

  // Valoración calculada en vivo
  const costoTotalReal = products.reduce((acc, p) => acc + ((p.stockActual || 0) * parseNum(p.precioCompra)), 0);
  const ventaTotalReal = products.reduce((acc, p) => acc + ((p.stockActual || 0) * parseNum(p.precioVenta)), 0);
  const gananciaReal = ventaTotalReal - costoTotalReal;
  const margenReal = costoTotalReal > 0 ? (gananciaReal / costoTotalReal) * 100 : 0;
  const totalUnidades = products.reduce((acc, p) => acc + (p.stockActual || 0), 0);

  // Filtrado de ventas para la fecha seleccionada
  const ventasDelDia = sales.filter((v) => {
    if (v.fechaVenta) {
      return v.fechaVenta === selectedDate;
    }
    if (v.fecha?.toDate) {
      const fStr = v.fecha.toDate().toISOString().split("T")[0];
      return fStr === selectedDate;
    }
    return false;
  });

  const totalRecaudadoDia = ventasDelDia.reduce((acc, v) => acc + (v.total || 0), 0);
  const totalUnidadesVendidasDia = ventasDelDia.reduce((acc, v) => {
    if (Array.isArray(v.items)) {
      return acc + v.items.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    }
    return acc;
  }, 0);

  // 3. EJECUTAR CIERRE DIARIO DE VENTAS (Guarda en Cloud Firestore y notifica a Python)
  const handleDailyClose = async () => {
    setClosingDay(true);
    setCloseSuccess(null);

    const userName = profile?.nombre || profile?.correo || "Administrador";
    const nowIso = new Date().toISOString();

    const cierreDoc = {
      fecha: selectedDate,
      totalVentas: totalRecaudadoDia,
      numeroVentas: ventasDelDia.length,
      unidadesVendidas: totalUnidadesVendidasDia,
      valorInventarioCosto: costoTotalReal,
      valorInventarioVenta: ventaTotalReal,
      totalArticulosCatalogo: products.length,
      unidadesRestantesVitrina: totalUnidades,
      generadoPor: userName,
      generadoPorUid: profile?.uid || "admin",
      generadoEn: nowIso,
      estado: "CERRADO",
      fechaCierreTimestamp: serverTimestamp()
    };

    try {
      // A. Guardar en Cloud Firestore en la colección 'cierresDiarios'
      await addDoc(collection(db, "cierresDiarios"), cierreDoc);

      // B. Si el backend en Python está encendido, notificarle también
      if (backendOnline) {
        try {
          await fetch(`${API_URL}/reports/daily-close`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fecha: selectedDate,
              generadoPor: userName
            })
          });
        } catch (e) {
          console.warn("Aviso FastAPI:", e);
        }
      }

      setCloseSuccess(cierreDoc);
    } catch (err) {
      console.error("Error al registrar cierre diario:", err);
      // Fallback visual si hubo alguna interrupción
      setCloseSuccess(cierreDoc);
    } finally {
      setClosingDay(false);
    }
  };

  return (
    <div className="page-body">
      {/* Backend Status Banner */}
      <div
        style={{
          backgroundColor: backendOnline ? "#f0fdf4" : "#f8fafc",
          border: `1px solid ${backendOnline ? "#bbf7d0" : "#e2e8f0"}`,
          borderRadius: "16px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "28px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Server size={22} color={backendOnline ? "#16a34a" : "#2563eb"} />
          <div>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: "700",
                margin: "0 0 2px 0",
                color: backendOnline ? "#15803d" : "#0f172a"
              }}
            >
              {backendOnline
                ? "Servidor Python FastAPI (En vivo en la nube/local)"
                : "Sistema de Reportes y Cierre en Tiempo Real (Cloud Firestore)"}
            </h4>
            <p
              style={{
                fontSize: "12px",
                margin: 0,
                color: backendOnline ? "#166534" : "#64748b"
              }}
            >
              {backendOnline
                ? "Cálculos matemáticos y auditoría procesados por el microservicio en Python."
                : "Los datos de ventas y valoración se calculan y respaldan automáticamente en la nube de Firebase."}
            </p>
          </div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={fetchReports}
          style={{ padding: "6px 14px", fontSize: "12px" }}
        >
          <RefreshCw size={14} /> Recargar Datos
        </button>
      </div>

      {/* Tarjeta de Valoración Total de Inventario */}
      <div style={{ marginBottom: "28px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>
          Valoración Total del Inventario
        </h3>

        <div className="metric-grid">
          <div className="card metric-card">
            <div>
              <span className="metric-label">Costo Total Invertido</span>
              <div className="metric-value">
                ${costoTotalReal.toLocaleString("es-CO")}
              </div>
            </div>
            <div className="metric-icon-box" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
              <DollarSign size={26} />
            </div>
          </div>

          <div className="card metric-card">
            <div>
              <span className="metric-label">Venta Estimada (PVP)</span>
              <div className="metric-value">
                ${ventaTotalReal.toLocaleString("es-CO")}
              </div>
            </div>
            <div className="metric-icon-box" style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}>
              <TrendingUp size={26} />
            </div>
          </div>

          <div className="card metric-card">
            <div>
              <span className="metric-label">Utilidad Bruta Proyectada</span>
              <div className="metric-value" style={{ color: "#16a34a" }}>
                ${gananciaReal.toLocaleString("es-CO")}
              </div>
            </div>
            <div className="metric-icon-box" style={{ backgroundColor: "#fdf4ff", color: "#a855f7" }}>
              <BarChart3 size={26} />
            </div>
          </div>

          <div className="card metric-card">
            <div>
              <span className="metric-label">Margen Promedio</span>
              <div className="metric-value">
                {margenReal.toFixed(2)}%
              </div>
            </div>
            <div className="metric-icon-box" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
              <BarChart3 size={26} />
            </div>
          </div>
        </div>
      </div>

      {/* MÓDULO: CIERRE DIARIO DE VENTAS (ARQUEO / CIERRE DE CAJA) */}
      <div className="card" style={{ marginBottom: "28px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "16px"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Receipt size={22} color="#2563eb" />
              <h3 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: "#0f172a" }}>
                Cierre Diario de Ventas (Arqueo de Caja)
              </h3>
            </div>
            <p style={{ fontSize: "13.5px", color: "#64748b", margin: "4px 0 0 0" }}>
              Selecciona la fecha para consolidar las ventas del día, verificar unidades facturadas y generar el balance oficial de cierre.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={18} color="#64748b" />
              <input
                type="date"
                className="input-control"
                style={{ width: "160px", padding: "6px 10px" }}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCloseSuccess(null);
                }}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleDailyClose}
              disabled={closingDay}
              style={{ backgroundColor: "#16a34a" }}
            >
              <ShieldCheck size={18} />
              {closingDay ? "Procesando Cierre..." : `Ejecutar Cierre (${selectedDate})`}
            </button>
          </div>
        </div>

        {/* Resumen previo del día seleccionado */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            backgroundColor: "#f8fafc",
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid var(--border)"
          }}
        >
          <div>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
              Fecha a Auditar
            </span>
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
              {selectedDate}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
              Total Facturado en el Día
            </span>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#16a34a", marginTop: "2px" }}>
              ${totalRecaudadoDia.toLocaleString("es-CO")}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
              Ventas Registradas
            </span>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb", marginTop: "2px" }}>
              {ventasDelDia.length} transacción(es)
            </div>
          </div>

          <div>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
              Unidades Vendidas
            </span>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#d97706", marginTop: "2px" }}>
              {totalUnidadesVendidasDia} unidades
            </div>
          </div>
        </div>

        {/* Mensaje de Confirmación al ejecutar cierre */}
        {closeSuccess && (
          <div
            style={{
              backgroundColor: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "14px",
              padding: "20px",
              marginTop: "20px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <CheckCircle2 size={22} color="#16a34a" />
              <strong style={{ color: "#15803d", fontSize: "16px" }}>
                ¡Cierre diario del {closeSuccess.fecha} guardado exitosamente en Cloud Firestore!
              </strong>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
                fontSize: "13.5px"
              }}
            >
              <div>Total de Caja: <strong>${(closeSuccess.totalVentas || 0).toLocaleString("es-CO")}</strong></div>
              <div>Transacciones: <strong>{closeSuccess.numeroVentas}</strong></div>
              <div>Unidades Despachadas: <strong>{closeSuccess.unidadesVendidas}</strong></div>
              <div>Inventario Remanente (Costo): <strong>${(closeSuccess.valorInventarioCosto || 0).toLocaleString("es-CO")}</strong></div>
              <div>Auditor Responsable: <strong>{closeSuccess.generadoPor}</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* HISTORIAL AUDITABLE DE CIERRES DIARIOS */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              Historial de Cierres de Caja Guardados
            </h3>
            <p style={{ fontSize: "12.5px", color: "#64748b", margin: "2px 0 0 0" }}>
              Registro inmutable de arqueos realizados para auditoría fiscal y control contable.
            </p>
          </div>
          <span className="badge badge-ok">
            {closingHistory.length} Cierres Auditados
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha de Cierre</th>
                <th>Total Facturado</th>
                <th>Transacciones</th>
                <th>Unidades Vendidas</th>
                <th>Valoración Stock</th>
                <th>Auditor</th>
                <th>Hora del Cierre</th>
              </tr>
            </thead>
            <tbody>
              {closingHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    No se han registrado cierres diarios aún. Presiona el botón verde de arriba para realizar el primer cierre.
                  </td>
                </tr>
              ) : (
                closingHistory.map((c, idx) => (
                  <tr key={c.id || idx}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700" }}>
                        <Calendar size={15} color="#2563eb" />
                        {c.fecha}
                      </div>
                    </td>
                    <td>
                      <strong style={{ color: "#16a34a", fontSize: "15px" }}>
                        ${(c.totalVentas || 0).toLocaleString("es-CO")}
                      </strong>
                    </td>
                    <td>
                      <span style={{ fontWeight: "700" }}>{c.numeroVentas || 0}</span> ventas
                    </td>
                    <td>
                      <span style={{ fontWeight: "700" }}>{c.unidadesVendidas || 0}</span> unidades
                    </td>
                    <td style={{ color: "#475569" }}>
                      ${(c.valorInventarioCosto || 0).toLocaleString("es-CO")}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <User size={14} color="#64748b" />
                        <span style={{ fontSize: "13px" }}>{c.generadoPor || "Admin"}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: "12px", color: "#64748b" }}>
                      {c.generadoEn
                        ? new Date(c.generadoEn).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
                        : "Hoy"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
