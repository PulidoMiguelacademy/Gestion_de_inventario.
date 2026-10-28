import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Package,
  X,
  Ban,
  ArrowDownLeft
} from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ activeTab, setActiveTab }) {
  const { profile, isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filterType, setFilterType] = useState("TODOS"); // "TODOS" | "AGOTADOS" | "BAJO"
  const dropdownRef = useRef(null);

  const titles = {
    dashboard: "Panel General de Inventario",
    products: "Catálogo de Productos y Existencias",
    movements: "Historial de Movimientos y Operaciones de Inventario",
    suppliers: "Directorio de Proveedores",
    reports: "Reportes Financieros y Analítica (Python)",
    users: "Administración de Colaboradores y Roles"
  };

  // Escuchar productos en tiempo real desde Cloud Firestore para alimentar las alertas
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "productos"),
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.activo !== false);
        setProducts(list);
      },
      (err) => {
        console.warn("Aviso en alertas de Navbar:", err);
      }
    );

    return () => unsub();
  }, []);

  // Cerrar el menú desplegable al hacer clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  // Clasificación de productos en alerta
  const agotados = products.filter(
    (p) => (p.stockActual || 0) <= 0 || p.estadoStock === "AGOTADO"
  );
  const bajoStock = products.filter(
    (p) =>
      (p.stockActual || 0) > 0 &&
      (p.stockActual <= (p.stockMinimo || 3) || p.estadoStock === "BAJO")
  );
  const totalAlertas = agotados.length + bajoStock.length;

  // Filtrado dentro del panel desplegable
  const productosFiltrados =
    filterType === "AGOTADOS"
      ? agotados
      : filterType === "BAJO"
      ? bajoStock
      : [...agotados, ...bajoStock];

  const handleNavigate = (tab) => {
    setShowNotifications(false);
    if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  return (
    <header
      style={{
        height: "70px",
        backgroundColor: "white",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 36px",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}
    >
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
          {titles[activeTab] || "Inventario"}
        </h2>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* ================================================================= */}
        {/* CAMPANITA DE NOTIFICACIONES DE STOCK (Fija siempre arriba)       */}
        {/* ================================================================= */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            title={
              totalAlertas > 0
                ? `${totalAlertas} alerta(s) de inventario: ${agotados.length} agotado(s), ${bajoStock.length} bajo stock`
                : "No hay alertas de inventario pendientes"
            }
            style={{
              position: "relative",
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              border: totalAlertas > 0 ? "1px solid #fecaca" : "1px solid #e2e8f0",
              backgroundColor: totalAlertas > 0 ? "#fff1f2" : "#f8fafc",
              color: totalAlertas > 0 ? "#dc2626" : "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: totalAlertas > 0 ? "0 2px 6px rgba(220, 38, 38, 0.15)" : "none"
            }}
          >
            <Bell size={20} />

            {/* Badge contador de alertas */}
            {totalAlertas > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  backgroundColor: agotados.length > 0 ? "#dc2626" : "#f59e0b",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: "800",
                  height: "20px",
                  minWidth: "20px",
                  padding: "0 5px",
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid white",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                }}
              >
                {totalAlertas}
              </span>
            )}
          </button>

          {/* Menú desplegable de Alertas */}
          {showNotifications && (
            <div
              style={{
                position: "absolute",
                top: "52px",
                right: 0,
                width: "420px",
                maxWidth: "90vw",
                backgroundColor: "white",
                borderRadius: "16px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                border: "1px solid var(--border)",
                overflow: "hidden",
                zIndex: 1000,
                animation: "fadeIn 0.15s ease-out"
              }}
            >
              {/* Encabezado del dropdown */}
              <div
                style={{
                  padding: "16px 20px",
                  backgroundColor: "#0f172a",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Bell size={18} color="#38bdf8" />
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>
                      Alertas de Inventario
                    </h4>
                    <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
                      {totalAlertas === 0
                        ? "Todas las existencias están al día"
                        : `${totalAlertas} producto(s) requieren atención`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px"
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Pestañas de filtro rápido dentro del dropdown */}
              {totalAlertas > 0 && (
                <div
                  style={{
                    display: "flex",
                    borderBottom: "1px solid #e2e8f0",
                    backgroundColor: "#f8fafc",
                    padding: "6px 12px",
                    gap: "6px"
                  }}
                >
                  <button
                    onClick={() => setFilterType("TODOS")}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      fontSize: "12px",
                      fontWeight: filterType === "TODOS" ? "700" : "500",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: filterType === "TODOS" ? "white" : "transparent",
                      color: filterType === "TODOS" ? "#0f172a" : "#64748b",
                      boxShadow: filterType === "TODOS" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                      cursor: "pointer"
                    }}
                  >
                    Todos ({totalAlertas})
                  </button>
                  <button
                    onClick={() => setFilterType("AGOTADOS")}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      fontSize: "12px",
                      fontWeight: filterType === "AGOTADOS" ? "700" : "500",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: filterType === "AGOTADOS" ? "#fee2e2" : "transparent",
                      color: filterType === "AGOTADOS" ? "#dc2626" : "#64748b",
                      cursor: "pointer"
                    }}
                  >
                    🚫 Agotados ({agotados.length})
                  </button>
                  <button
                    onClick={() => setFilterType("BAJO")}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      fontSize: "12px",
                      fontWeight: filterType === "BAJO" ? "700" : "500",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: filterType === "BAJO" ? "#fef3c7" : "transparent",
                      color: filterType === "BAJO" ? "#b45309" : "#64748b",
                      cursor: "pointer"
                    }}
                  >
                    ⚠️ Bajo Stock ({bajoStock.length})
                  </button>
                </div>
              )}

              {/* Lista scrollable de alertas */}
              <div style={{ maxHeight: "360px", overflowY: "auto", padding: "12px" }}>
                {totalAlertas === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        backgroundColor: "#f0fdf4",
                        color: "#16a34a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 12px auto"
                      }}
                    >
                      <CheckCircle2 size={26} />
                    </div>
                    <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px", marginBottom: "4px" }}>
                      ¡Inventario en estado óptimo!
                    </div>
                    <p style={{ fontSize: "12px", margin: 0 }}>
                      No hay productos agotados ni por debajo del stock mínimo.
                    </p>
                  </div>
                ) : productosFiltrados.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 16px", color: "#64748b", fontSize: "13px" }}>
                    No hay productos en esta categoría.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {productosFiltrados.map((p) => {
                      const isAgotado = (p.stockActual || 0) <= 0 || p.estadoStock === "AGOTADO";

                      return (
                        <div
                          key={p.id}
                          style={{
                            padding: "12px",
                            borderRadius: "10px",
                            backgroundColor: isAgotado ? "#fff1f2" : "#fffbeb",
                            border: `1px solid ${isAgotado ? "#fecdd3" : "#fef08a"}`,
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                            <div>
                              <div style={{ fontWeight: "700", fontSize: "13.5px", color: "#0f172a" }}>
                                {p.nombre}
                              </div>
                              <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                                {p.marca || "Genérico"} • Cód: {p.codigoBarras || "N/A"}
                              </div>
                            </div>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "800",
                                backgroundColor: isAgotado ? "#fee2e2" : "#fef3c7",
                                color: isAgotado ? "#991b1b" : "#92400e"
                              }}
                            >
                              {isAgotado ? <Ban size={12} /> : <AlertTriangle size={12} />}
                              {isAgotado ? "NO DISPONIBLE" : "BAJO STOCK"}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "12px",
                              paddingTop: "6px",
                              borderTop: `1px dashed ${isAgotado ? "#fecdd3" : "#fef08a"}`
                            }}
                          >
                            <div>
                              <span style={{ color: "#64748b" }}>Stock: </span>
                              <strong
                                style={{
                                  color: isAgotado ? "#dc2626" : "#b45309",
                                  fontSize: "13px"
                                }}
                              >
                                {p.stockActual || 0} unidades
                              </strong>
                              <span style={{ color: "#64748b", fontSize: "11px" }}>
                                {" "}(Mín: {p.stockMinimo || 3})
                              </span>
                            </div>

                            <button
                              onClick={() => handleNavigate("movements")}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                backgroundColor: isAgotado ? "#dc2626" : "#2563eb",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "11px",
                                fontWeight: "700",
                                cursor: "pointer"
                              }}
                              title="Registrar entrada de mercancía para reabastecer"
                            >
                              <ArrowDownLeft size={12} />
                              Reabastecer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pie del menú con accesos rápidos */}
              <div
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <button
                  onClick={() => handleNavigate("products")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: 0
                  }}
                >
                  <Package size={14} /> Ver Catálogo
                </button>
                <button
                  onClick={() => handleNavigate("movements")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#16a34a",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: 0
                  }}
                >
                  <ArrowDownLeft size={14} /> Ir a Movimientos
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Realtime Status Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: "600",
            color: "#16a34a"
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              display: "inline-block"
            }}
          />
          <span>Cloud Firestore Conectado</span>
        </div>

        {/* Role Pill */}
        <div
          style={{
            padding: "6px 14px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: "700",
            backgroundColor: isAdmin ? "#e0e7ff" : "#f1f5f9",
            color: isAdmin ? "#4338ca" : "#475569",
            textTransform: "uppercase"
          }}
        >
          {isAdmin ? "Administrador" : "Operador"}
        </div>
      </div>
    </header>
  );
}
