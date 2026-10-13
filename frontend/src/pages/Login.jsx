import React, { useState } from "react";
import { 
  Store, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  ArrowLeft 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, register, resetPassword, authError, clearError } = useAuth();
  
  // mode: "login" | "register" | "forgot"
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    setResetSent(false);
    clearError();

    // 1. MODO: RECUPERAR CONTRASEÑA
    if (mode === "forgot") {
      if (!email.trim() || !email.includes("@")) {
        setLocalError("Por favor ingresa un correo electrónico válido.");
        return;
      }
      setLoading(true);
      const res = await resetPassword(email);
      setLoading(false);
      if (res.success) {
        setResetSent(true);
      } else if (res.error) {
        setLocalError(res.error);
      }
      return;
    }

    // 2. MODO: REGISTRARSE
    if (mode === "register") {
      if (!name.trim()) {
        setLocalError("Por favor ingresa tu nombre completo.");
        return;
      }
      if (password.length < 6) {
        setLocalError("La contraseña debe tener mínimo 6 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Las contraseñas no coinciden.");
        return;
      }
      setLoading(true);
      const res = await register(name, email, password);
      setLoading(false);
      if (!res.success && res.error) setLocalError(res.error);
      return;
    }

    // 3. MODO: INICIAR SESIÓN
    if (mode === "login") {
      if (!email.trim() || !password) {
        setLocalError("Ingresa tu correo y contraseña.");
        return;
      }
      setLoading(true);
      const res = await login(email, password);
      setLoading(false);
      if (!res.success && res.error) setLocalError(res.error);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0f172a",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "460px",
        backgroundColor: "white",
        borderRadius: "24px",
        padding: "40px 36px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            backgroundColor: mode === "forgot" ? "#7c3aed" : "#2563eb",
            color: "white",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
            boxShadow: mode === "forgot" 
              ? "0 10px 15px -3px rgba(124, 58, 237, 0.3)" 
              : "0 10px 15px -3px rgba(37, 99, 235, 0.3)",
            transition: "all 0.3s ease"
          }}>
            {mode === "forgot" ? <KeyRound size={28} /> : <Store size={30} />}
          </div>

          <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px 0" }}>
            {mode === "forgot" 
              ? "Recuperar Contraseña" 
              : mode === "register" 
              ? "Registro de Colaborador" 
              : "TecnoStock Web"}
          </h2>

          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
            {mode === "forgot"
              ? "Te enviaremos un enlace seguro para crear tu nueva contraseña"
              : mode === "register"
              ? "Crea tu cuenta de operador para el sistema de inventario"
              : "Control de inventario para tienda de tecnología"}
          </p>
        </div>

        {/* Error Alert */}
        {(localError || authError) && (
          <div style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            borderRadius: "12px",
            padding: "12px 14px",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px"
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{localError || authError}</span>
          </div>
        )}

        {/* Success Alert (Recuperación enviada) */}
        {resetSent && (
          <div style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#15803d",
            borderRadius: "12px",
            padding: "14px 16px",
            fontSize: "13.5px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            marginBottom: "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700" }}>
              <CheckCircle2 size={18} />
              <span>¡Correo enviado con éxito!</span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.4" }}>
              Hemos enviado un enlace a <strong>{email}</strong>. Revisa tu bandeja de entrada o carpeta de spam y haz clic en el enlace para restablecer tu contraseña.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="input-group">
              <label className="input-label">Nombre Completo</label>
              <div style={{ position: "relative" }}>
                <User size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
                <input
                  type="text"
                  className="input-control"
                  style={{ paddingLeft: "42px" }}
                  placeholder="Ej: Laura Gómez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Correo Electrónico</label>
            <div style={{ position: "relative" }}>
              <Mail size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
              <input
                type="email"
                className="input-control"
                style={{ paddingLeft: "42px" }}
                placeholder="tu-correo@tiendatecno.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div className="input-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label className="input-label" style={{ margin: 0 }}>Contraseña</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setLocalError("");
                      setResetSent(false);
                      clearError();
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontSize: "12.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>

              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
                <input
                  type="password"
                  className="input-control"
                  style={{ paddingLeft: "42px" }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {mode === "register" && (
            <div className="input-group">
              <label className="input-label">Confirmar Contraseña</label>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
                <input
                  type="password"
                  className="input-control"
                  style={{ paddingLeft: "42px" }}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              fontSize: "15px",
              marginTop: "10px",
              borderRadius: "12px",
              backgroundColor: mode === "forgot" ? "#7c3aed" : "#2563eb"
            }}
          >
            {loading ? (
              <span>Procesando...</span>
            ) : mode === "forgot" ? (
              <>Enviar Enlace de Recuperación <ArrowRight size={18} /></>
            ) : mode === "register" ? (
              <>Registrarme como Operador <ArrowRight size={18} /></>
            ) : (
              <>Ingresar al Sistema <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        {/* Links de alternancia */}
        <div style={{ textAlign: "center", marginTop: "24px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {mode === "forgot" ? (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setLocalError("");
                setResetSent(false);
                clearError();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                background: "none",
                border: "none",
                color: "#64748b",
                fontSize: "13.5px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              <ArrowLeft size={16} /> Volver a Iniciar Sesión
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setLocalError("");
                clearError();
              }}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                fontSize: "13.5px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              {mode === "login"
                ? "¿Eres nuevo colaborador? Crea tu cuenta aquí"
                : "¿Ya tienes una cuenta? Inicia sesión aquí"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
