import React from "react";
import { AlertTriangle, RefreshCw, LogOut, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary capturó un error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const isNotFoundError = this.state.error?.name === "NotFoundError" || 
        String(this.state.error?.message).includes("removeChild");

      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          padding: "20px"
        }}>
          <div style={{
            maxWidth: "520px",
            width: "100%",
            backgroundColor: "white",
            borderRadius: "20px",
            padding: "36px 32px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
            border: "1px solid #e2e8f0",
            textAlign: "center"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              backgroundColor: "#fee2e2",
              color: "#dc2626",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "18px"
            }}>
              <AlertTriangle size={30} />
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "8px" }}>
              {isNotFoundError 
                ? "Actualización de pantalla completada" 
                : "Ocurrió un problema visual inesperado"}
            </h2>

            <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.5", marginBottom: "24px" }}>
              {isNotFoundError
                ? "El navegador sincronizó cambios de vista o traducción. Tu sesión y los datos del inventario están completamente a salvo."
                : "No te preocupes, la base de datos de TecnoStock y tus datos están seguros. Haz clic en recargar para continuar."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  fontWeight: "600",
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                <RefreshCw size={16} /> Recargar Sistema
              </button>

              <button
                onClick={this.handleReset}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  fontWeight: "600",
                  fontSize: "13.5px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                <Home size={16} /> Intentar restablecer vista
              </button>
            </div>

            {/* Detalles técnicos plegables */}
            {this.state.error && (
              <details style={{ marginTop: "20px", textAlign: "left", fontSize: "12px", color: "#94a3b8" }}>
                <summary style={{ cursor: "pointer", fontWeight: "600" }}>Detalles técnicos del error</summary>
                <pre style={{ 
                  marginTop: "8px", 
                  padding: "10px", 
                  backgroundColor: "#f8fafc", 
                  borderRadius: "8px", 
                  overflowX: "auto",
                  color: "#e11d48",
                  fontSize: "11.5px"
                }}>
                  {String(this.state.error?.message || this.state.error)}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
