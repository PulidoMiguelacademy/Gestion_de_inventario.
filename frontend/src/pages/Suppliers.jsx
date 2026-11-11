import React, { useState, useEffect } from "react";
import {
  Truck,
  Plus,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  Edit2,
  Trash2,
  Search,
  X,
  ShieldCheck,
  Building2,
  AlertCircle
} from "lucide-react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export default function Suppliers() {
  const { profile, isAdmin } = useAuth();

  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [saving, setSaving] = useState(false);

  // Formulario de creación
  const [form, setForm] = useState({
    nombre: "",
    nit: "",
    telefono: "",
    correo: ""
  });

  // Escuchar proveedores en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "proveedores"),
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.activo !== false);
        setSuppliers(list);
      },
      (err) => {
        console.warn("Aviso proveedores:", err);
      }
    );
    return () => unsub();
  }, []);

  // 1. REGISTRAR PROVEEDOR
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.nit.trim()) {
      alert("El nombre y el NIT son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "proveedores"), {
        nombre: form.nombre.trim(),
        nit: form.nit.trim(),
        telefono: form.telefono.trim(),
        correo: form.correo.trim(),
        activo: true,
        fechaCreacion: serverTimestamp(),
        creadoPor: profile?.uid || "admin"
      });

      setShowModal(false);
      setForm({ nombre: "", nit: "", telefono: "", correo: "" });
    } catch (err) {
      console.error("Error al registrar proveedor:", err);
      alert("Error al registrar proveedor: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 2. ABRIR MODAL DE EDICIÓN (SOLO ADMINISTRADOR)
  const openEditModal = (supplier) => {
    if (!isAdmin) {
      alert("Acceso denegado: Solo los administradores pueden editar proveedores.");
      return;
    }
    setEditingSupplier({
      id: supplier.id,
      nombre: supplier.nombre || "",
      nit: supplier.nit || "",
      telefono: supplier.telefono || "",
      correo: supplier.correo || ""
    });
    setShowEditModal(true);
  };

  // 3. GUARDAR CAMBIOS DE EDICIÓN (SOLO ADMINISTRADOR)
  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Acceso denegado: Solo los administradores pueden editar proveedores.");
      return;
    }

    if (!editingSupplier.nombre.trim() || !editingSupplier.nit.trim()) {
      alert("El nombre y el NIT son obligatorios.");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "proveedores", editingSupplier.id), {
        nombre: editingSupplier.nombre.trim(),
        nit: editingSupplier.nit.trim(),
        telefono: editingSupplier.telefono.trim(),
        correo: editingSupplier.correo.trim(),
        fechaModificacion: serverTimestamp()
      });

      setShowEditModal(false);
      setEditingSupplier(null);
    } catch (err) {
      console.error("Error al actualizar proveedor:", err);
      alert("Error al actualizar proveedor: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 4. ELIMINAR PROVEEDOR (SOLO ADMINISTRADOR)
  const handleDeleteSupplier = async (supplier) => {
    if (!isAdmin) {
      alert("Acceso denegado: Solo los administradores pueden eliminar proveedores.");
      return;
    }

    const confirmacion = window.confirm(
      `¿Estás seguro de que deseas eliminar al proveedor "${supplier.nombre}" (NIT: ${supplier.nit})?\n\nEsta acción no se puede deshacer.`
    );

    if (confirmacion) {
      try {
        await deleteDoc(doc(db, "proveedores", supplier.id));
      } catch (err) {
        console.error("Error al eliminar proveedor:", err);
        alert("Error al eliminar proveedor: " + err.message);
      }
    }
  };

  // Filtrado de proveedores
  const filteredSuppliers = suppliers.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      !term ||
      s.nombre?.toLowerCase().includes(term) ||
      s.nit?.toLowerCase().includes(term) ||
      s.telefono?.toLowerCase().includes(term) ||
      s.correo?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="page-body">
      {/* Encabezado del Módulo */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
              Directorio de Proveedores
            </h3>
            {isAdmin ? (
              <span
                style={{
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <ShieldCheck size={13} /> Gestión Admin Habilitada
              </span>
            ) : (
              <span
                style={{
                  backgroundColor: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  color: "#64748b",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: "600"
                }}
              >
                Modo Consulta (Operador)
              </span>
            )}
          </div>
          <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0 }}>
            Distribuidores mayoristas autorizados para compras, reposición de inventario y garantías.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Nuevo Proveedor
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="card" style={{ marginBottom: "24px", padding: "16px 20px" }}>
        <div style={{ position: "relative", maxWidth: "480px" }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
          <input
            type="text"
            className="input-control"
            style={{ paddingLeft: "42px" }}
            placeholder="Buscar proveedor por nombre, NIT, teléfono o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid de Proveedores */}
      {filteredSuppliers.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
          <Truck size={42} style={{ color: "#94a3b8", margin: "0 auto 12px auto" }} />
          <h4 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
            No se encontraron proveedores
          </h4>
          <p style={{ fontSize: "13px", margin: 0 }}>
            {searchTerm
              ? `No hay resultados para "${searchTerm}".`
              : "Aún no hay proveedores registrados. Haz clic en 'Nuevo Proveedor' para agregar uno."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          {filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.2s ease"
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: "16px"
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      backgroundColor: "#eff6ff",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Truck size={24} />
                  </div>
                  <span className="badge badge-ok">
                    <CheckCircle2 size={12} /> ACTIVO
                  </span>
                </div>

                <h4 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "10px" }}>
                  {s.nombre}
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "9px", fontSize: "13px", color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FileText size={15} color="#94a3b8" />
                    <span>
                      NIT: <strong>{s.nit}</strong>
                    </span>
                  </div>
                  {s.telefono && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Phone size={15} color="#94a3b8" />
                      <span>{s.telefono}</span>
                    </div>
                  )}
                  {s.correo && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Mail size={15} color="#94a3b8" />
                      <span>{s.correo}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción: SOLO VISIBLES PARA EL ADMINISTRADOR */}
              {isAdmin && (
                <div
                  style={{
                    marginTop: "20px",
                    paddingTop: "14px",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px"
                  }}
                >
                  <button
                    onClick={() => openEditModal(s)}
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#2563eb",
                      cursor: "pointer",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      transition: "all 0.15s ease"
                    }}
                    title="Editar datos del proveedor (Solo Admin)"
                  >
                    <Edit2 size={13} /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteSupplier(s)}
                    style={{
                      background: "#fff1f2",
                      border: "1px solid #fecdd3",
                      color: "#dc2626",
                      cursor: "pointer",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      transition: "all 0.15s ease"
                    }}
                    title="Eliminar proveedor (Solo Admin)"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Registrar Nuevo Proveedor */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Plus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: "#0f172a" }}>
                    Registrar Nuevo Proveedor
                  </h3>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                    Ingresa los datos del distribuidor mayorista
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier}>
              <div className="input-group">
                <label className="input-label">Razón Social o Nombre Comercial *</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Ej: Distribuidora TecnoAndina S.A.S."
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">NIT o Documento Fiscal *</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Ej: 901.234.567-8"
                  value={form.nit}
                  onChange={(e) => setForm({ ...form, nit: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="input-group">
                  <label className="input-label">Teléfono de Contacto</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Ej: +57 604 444 1234"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="input-control"
                    placeholder="ventas@proveedor.com"
                    value={form.correo}
                    onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar Proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Proveedor (EXCLUSIVO PARA ADMINISTRADOR) */}
      {showEditModal && editingSupplier && isAdmin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: "#0f172a" }}>
                    Editar Información del Proveedor
                  </h3>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                    Exclusivo para el Administrador
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSupplier(null);
                }}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSupplier}>
              <div className="input-group">
                <label className="input-label">Razón Social o Nombre Comercial *</label>
                <input
                  type="text"
                  className="input-control"
                  value={editingSupplier.nombre}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">NIT o Documento Fiscal *</label>
                <input
                  type="text"
                  className="input-control"
                  value={editingSupplier.nit}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, nit: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="input-group">
                  <label className="input-label">Teléfono de Contacto</label>
                  <input
                    type="text"
                    className="input-control"
                    value={editingSupplier.telefono}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, telefono: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Correo Electrónico</label>
                  <input
                    type="email"
                    className="input-control"
                    value={editingSupplier.correo}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, correo: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSupplier(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Guardando cambios..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
