import React from "react";
import { Wifi, Sparkles, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ activeTab }) {
  const { profile, isAdmin } = useAuth();

  const titles = {
    dashboard: "Panel General de Inventario",
    products: "Catálogo de Productos y Existencias",
    movements: "Historial de Movimientos y Operaciones de Inventario",
    suppliers: "Directorio de Proveedores",
    reports: "Reportes Financieros y Analítica (Python)",
    users: "Administración de Colaboradores y Roles"
  };

  return (
    <header style={{
      height: "70px",
      backgroundColor: "white",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 36px"
    }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
          {titles[activeTab] || "Inventario"}
        </h2>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Realtime Status Indicator */}
        <div style={{
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
        }}>
          <span style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#22c55e",
            display: "inline-block"
          }} />
          <span>Cloud Firestore Conectado</span>
        </div>

        {/* Role Pill */}
        <div style={{
          padding: "6px 14px",
          borderRadius: "9999px",
          fontSize: "12px",
          fontWeight: "700",
          backgroundColor: isAdmin ? "#e0e7ff" : "#f1f5f9",
          color: isAdmin ? "#4338ca" : "#475569",
          textTransform: "uppercase"
        }}>
          {isAdmin ? "Administrador" : "Operador"}
        </div>
      </div>
    </header>
  );
}
