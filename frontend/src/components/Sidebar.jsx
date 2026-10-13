import React from "react";
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  ArrowLeftRight, 
  BarChart3, 
  Users, 
  LogOut, 
  ShieldCheck, 
  Store
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ activeTab, setActiveTab }) {
  const { profile, isAdmin, logout } = useAuth();

  const menuItems = [
    { id: "dashboard", label: "Panel General", icon: LayoutDashboard },
    { id: "products", label: "Catálogo de Productos", icon: Package },
    { id: "suppliers", label: "Proveedores", icon: Truck },
    { id: "reports", label: "Reportes & Analítica (Python)", icon: BarChart3 },
  ];

  if (isAdmin) {
    menuItems.push({ id: "users", label: "Gestión de Colaboradores", icon: Users });
  }

  return (
    <aside style={{
      width: "var(--sidebar-w)",
      backgroundColor: "#0f172a",
      color: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid #1e293b",
      padding: "24px 16px",
      minHeight: "100vh"
    }}>
      {/* Brand Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 8px 24px 8px", borderBottom: "1px solid #1e293b" }}>
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          backgroundColor: "#2563eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white"
        }}>
          <Store size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: "16px", fontWeight: "800", letterSpacing: "-0.3px", margin: 0 }}>TecnoStock</h1>
          <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>Gestión de Inventario Web</p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "24px", flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                fontSize: "13.5px",
                fontWeight: isActive ? "600" : "500",
                color: isActive ? "#ffffff" : "#94a3b8",
                backgroundColor: isActive ? "#2563eb" : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "#1e293b";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div style={{ 
        padding: "14px", 
        backgroundColor: "#1e293b", 
        borderRadius: "12px", 
        marginTop: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: isAdmin ? "#4338ca" : "#0284c7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: "700"
          }}>
            {String(profile?.nombre || profile?.correo || "U").charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: "hidden" }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
              {profile?.nombre || profile?.correo || "Usuario"}
            </p>
            <span style={{ 
              fontSize: "10px", 
              fontWeight: "700", 
              color: isAdmin ? "#818cf8" : "#38bdf8",
              textTransform: "uppercase"
            }}>
              {profile?.rol || "Operador"}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            padding: "8px",
            borderRadius: "8px",
            backgroundColor: "#334155",
            color: "#f8fafc",
            border: "none",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#ef4444"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#334155"}
        >
          <LogOut size={14} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
