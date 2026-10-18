import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Movements from "./pages/Movements";
import Suppliers from "./pages/Suppliers";
import Reports from "./pages/Reports";
import UsersManagement from "./pages/UsersManagement";

function MainApp() {
  const { user, profile, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Si el usuario no es admin y la pestaña activa era 'users', redirigir a 'dashboard'
  useEffect(() => {
    if (!isAdmin && activeTab === "users") {
      setActiveTab("dashboard");
    }
  }, [isAdmin, activeTab]);

  // Al cambiar de usuario / cerrar e iniciar sesión, reiniciar en el panel general
  useEffect(() => {
    if (user?.uid) {
      setActiveTab("dashboard");
    }
  }, [user?.uid]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        flexDirection: "column",
        gap: "16px"
      }}>
        <div className="spinner" />
        <p style={{ color: "#64748b", fontWeight: "600", fontSize: "14px" }}>
          Cargando TecnoStock Web...
        </p>
      </div>
    );
  }

  // Si no está autenticado, mostrar pantalla de Login / Registro
  if (!user || !profile) {
    return <Login />;
  }

  return (
    <div className="app-container">
      {/* Barra lateral de navegación */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Contenido Principal */}
      <div className="main-content">
        <Navbar activeTab={activeTab} />

        <ErrorBoundary>
          {activeTab === "dashboard" && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === "products" && <Products />}
          {activeTab === "movements" && <Movements />}
          {activeTab === "suppliers" && <Suppliers />}
          {activeTab === "reports" && <Reports />}
          {activeTab === "users" && <UsersManagement />}
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
