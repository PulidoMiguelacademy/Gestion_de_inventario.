import React, { useState, useEffect } from "react";
import { Truck, Plus, Phone, Mail, FileText, CheckCircle2 } from "lucide-react";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    nit: "",
    telefono: "",
    correo: ""
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "proveedores"), (snapshot) => {
      setSuppliers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Aviso proveedores:", err);
    });
    return () => unsub();
  }, []);

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
        activo: true
      });

      setShowModal(false);
      setForm({ nombre: "", nit: "", telefono: "", correo: "" });
    } catch (err) {
      alert("Error al registrar proveedor: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-body">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: "700", margin: "0 0 4px 0" }}>Proveedores Oficiales</h3>
          <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0 }}>
            Distribuidores mayoristas autorizados para compras, reposición de inventario y garantías.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Nuevo Proveedor
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {suppliers.map(s => (
          <div key={s.id} className="card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Truck size={24} />
              </div>
              <span className="badge badge-ok">
                <CheckCircle2 size={12} /> ACTIVO
              </span>
            </div>

            <h4 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
              {s.nombre}
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "#475569" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={15} color="#94a3b8" />
                <span>NIT: <strong>{s.nit}</strong></span>
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
        ))}
      </div>

      {/* Modal Proveedor */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "20px" }}>
              Registrar Nuevo Proveedor
            </h3>

            <form onSubmit={handleCreateSupplier}>
              <div className="input-group">
                <label className="input-label">Razón Social o Nombre *</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Distribuidora TecnoAndina S.A.S."
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">NIT o Documento *</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="901234567-8"
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
                    placeholder="+57 604 444 1234"
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
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
    </div>
  );
}
