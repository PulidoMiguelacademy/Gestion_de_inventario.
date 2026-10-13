import React, { useState, useEffect } from "react";
import { Users, Shield, UserCheck, UserX, ShieldCheck, Mail, Check, X } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export default function UsersManagement() {
  const { user: currentAuthUser, isAdmin } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(db, "usuarios"), (snapshot) => {
      setUsersList(snapshot.docs.map(d => ({ uid: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Aviso usuarios:", err);
    });
    return () => unsub?.();
  }, [isAdmin]);

  const handleToggleActive = async (targetUser) => {
    if (targetUser.uid === currentAuthUser?.uid) {
      alert("No puedes desactivar tu propia cuenta de Administrador.");
      return;
    }

    setUpdating(targetUser.uid);
    try {
      await updateDoc(doc(db, "usuarios", targetUser.uid), {
        activo: !targetUser.activo
      });
    } catch (err) {
      alert("Error al actualizar estado: " + err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleRole = async (targetUser) => {
    if (targetUser.uid === currentAuthUser?.uid) {
      alert("No puedes modificar tu propio rol.");
      return;
    }

    const newRole = targetUser.rol === "admin" ? "operador" : "admin";
    if (confirm(`¿Deseas cambiar el rol de ${targetUser.nombre || targetUser.correo} a ${newRole.toUpperCase()}?`)) {
      setUpdating(targetUser.uid);
      try {
        await updateDoc(doc(db, "usuarios", targetUser.uid), {
          rol: newRole
        });
      } catch (err) {
        alert("Error al cambiar rol: " + err.message);
      } finally {
        setUpdating(null);
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="page-body">
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <Shield color="#dc2626" size={48} style={{ margin: "0 auto 16px auto" }} />
          <h3>Acceso Restringido</h3>
          <p style={{ color: "#64748b" }}>Solo los administradores tienen permiso para gestionar colaboradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-body">
      <div style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "700", margin: "0 0 4px 0" }}>
          Gestión de Colaboradores y Roles
        </h3>
        <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0 }}>
          Como Administrador, puedes activar o desactivar empleados en tiempo real y asignar permisos de Operador o Administrador.
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Correo Electrónico</th>
                <th>Rol en el Sistema</th>
                <th>Estado de Acceso</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => {
                const isSelf = u.uid === currentAuthUser?.uid;
                return (
                  <tr key={u.uid} style={{ opacity: u.activo ? 1 : 0.65 }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: u.rol === "admin" ? "#e0e7ff" : "#f1f5f9",
                          color: u.rol === "admin" ? "#4338ca" : "#475569",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700"
                        }}>
                          {u.nombre ? u.nombre.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <div style={{ fontWeight: "700" }}>
                            {u.nombre || "Sin nombre"} {isSelf && "(Tú)"}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>UID: {u.uid.substring(0, 10)}...</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.correo}</td>
                    <td>
                      <button
                        onClick={() => handleToggleRole(u)}
                        disabled={isSelf || updating === u.uid}
                        className={`badge ${u.rol === "admin" ? "badge-admin" : "badge-operador"}`}
                        style={{ border: "none", cursor: isSelf ? "default" : "pointer" }}
                        title={isSelf ? "No puedes cambiar tu propio rol" : "Clic para cambiar rol"}
                      >
                        <Shield size={12} />
                        {u.rol?.toUpperCase()}
                      </button>
                    </td>
                    <td>
                      <span className={`badge ${u.activo ? "badge-ok" : "badge-agotado"}`}>
                        {u.activo ? "ACTIVO" : "INACTIVO"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {!isSelf && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={updating === u.uid}
                          className={`btn ${u.activo ? "btn-danger" : "btn-secondary"}`}
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                        >
                          {u.activo ? "Desactivar" : "Activar"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
