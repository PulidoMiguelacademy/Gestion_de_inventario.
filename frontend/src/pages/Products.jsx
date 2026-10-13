import React, { useState, useEffect } from "react";
import { 
  Package, 
  Search, 
  Plus, 
  Barcode, 
  Trash2, 
  ShoppingCart, 
  History, 
  ArrowDownRight, 
  Check, 
  AlertCircle,
  User,
  Calendar,
  DollarSign,
  Edit2
} from "lucide-react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export default function Products() {
  const { profile, isAdmin } = useAuth();
  
  // Navigation Tabs inside Products section
  const [activeSubTab, setActiveSubTab] = useState("catalogo"); // "catalogo" | "ventas" | "movimientos"

  // Data states
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [movementsHistory, setMovementsHistory] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("TODOS");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  const [saving, setSaving] = useState(false);

  // Form State: Nuevo Producto (Permite múltiples puntos tal como se escriban)
  const [form, setForm] = useState({
    codigoBarras: "",
    nombre: "",
    marca: "",
    proveedorId: "",
    categoriaId: "cat_celulares",
    precioCompra: "",
    precioVenta: "",
    stockActual: "",
    stockMinimo: "3",
    serializado: false
  });

  // Form State: Editar Producto (Admin)
  const [editForm, setEditForm] = useState({
    codigoBarras: "",
    nombre: "",
    marca: "",
    proveedorId: "",
    categoriaId: "cat_celulares",
    precioCompra: "",
    precioVenta: "",
    stockActual: "",
    stockMinimo: "3",
    serializado: false
  });

  // Form State: Registrar Venta
  const [saleForm, setSaleForm] = useState({
    cantidad: 1,
    cliente: "",
    precioVenta: 0,
    serialesVendidos: ""
  });

  useEffect(() => {
    // 1. Escuchar catálogo de productos
    const unsubProducts = onSnapshot(collection(db, "productos"), (snapshot) => {
      const prods = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.activo !== false);
      setProducts(prods);
    }, (err) => {
      console.warn("Aviso productos:", err);
    });

    // 2. Escuchar proveedores
    const unsubSuppliers = onSnapshot(collection(db, "proveedores"), (snapshot) => {
      setSuppliers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Aviso proveedores:", err);
    });

    // 3. Escuchar historial de ventas
    const qVentas = query(collection(db, "ventas"), orderBy("fecha", "desc"));
    const unsubSales = onSnapshot(qVentas, (snapshot) => {
      setSalesHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Aviso ventas:", err);
    });

    // 4. Escuchar kardex de movimientos
    const qMovs = query(collection(db, "movimientos"), orderBy("fecha", "desc"));
    const unsubMovs = onSnapshot(qMovs, (snapshot) => {
      setMovementsHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Aviso movimientos:", err);
    });

    return () => {
      unsubProducts();
      unsubSuppliers();
      unsubSales();
      unsubMovs();
    };
  }, []);

  // Función auxiliar para convertir números con puntos (ej: "650.000" -> 650000) para cálculos matemáticos
  const parsePuntos = (valorStr) => {
    if (!valorStr) return 0;
    // Si viene con puntos como separadores de miles, los eliminamos para obtener el valor numérico
    const sinPuntos = String(valorStr).replace(/\./g, "").replace(/,/g, ".");
    return parseFloat(sinPuntos) || 0;
  };

  // 1. REGISTRAR PRODUCTO (Guarda los puntos tal cual se escribieron)
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!form.codigoBarras || !form.nombre || !form.precioCompra || !form.precioVenta) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    const stock = parseInt(form.stockActual) || 0;
    const minStock = parseInt(form.stockMinimo) || 3;
    let estado = "OK";
    if (stock === 0) estado = "AGOTADO";
    else if (stock <= minStock) estado = "BAJO";

    const numCompra = parsePuntos(form.precioCompra);
    const numVenta = parsePuntos(form.precioVenta);

    setSaving(true);
    try {
      await addDoc(collection(db, "productos"), {
        // Se guarda el texto tal cual con los puntos que colocó el usuario
        codigoBarras: form.codigoBarras.trim(),
        nombre: form.nombre.trim(),
        nombreBusqueda: form.nombre.trim().toLowerCase(),
        marca: form.marca.trim() || "Genérico",
        proveedorId: form.proveedorId || (suppliers[0]?.id || "prov_tecnoandina"),
        categoriaId: form.categoriaId,
        serializado: Boolean(form.serializado),
        // Guardamos tanto el texto exacto con puntos como el valor numérico para reportes
        precioCompraFormateado: String(form.precioCompra).trim(),
        precioVentaFormateado: String(form.precioVenta).trim(),
        precioCompra: numCompra,
        precioVenta: numVenta,
        stockActual: stock,
        stockMinimo: minStock,
        estadoStock: estado,
        activo: true,
        fechaCreacion: serverTimestamp(),
        creadoPor: profile?.uid || "admin"
      });

      setShowCreateModal(false);
      setForm({
        codigoBarras: "",
        nombre: "",
        marca: "",
        proveedorId: "",
        categoriaId: "cat_celulares",
        precioCompra: "",
        precioVenta: "",
        stockActual: "",
        stockMinimo: "3",
        serializado: false
      });
    } catch (err) {
      console.error("Error guardando producto:", err);
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 2. ABRIR MODAL DE VENTA
  const openSaleModal = (product) => {
    if (product.stockActual <= 0) {
      alert("Este producto está AGOTADO. No se pueden realizar ventas hasta ingresar nuevo stock.");
      return;
    }
    setSelectedProduct(product);
    setSaleForm({
      cantidad: 1,
      cliente: "",
      precioVenta: product.precioVenta || 0,
      serialesVendidos: ""
    });
    setShowSaleModal(true);
  };

  // 3. CONFIRMAR VENTA, DESCONTAR STOCK Y ENVIAR A HISTORIAL
  const handleConfirmSale = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qty = parseInt(saleForm.cantidad) || 0;
    if (qty <= 0) {
      alert("La cantidad a vender debe ser al menos 1.");
      return;
    }

    if (qty > selectedProduct.stockActual) {
      alert(`No hay suficiente stock. Disponibles actualmente: ${selectedProduct.stockActual}`);
      return;
    }

    const nuevoStock = selectedProduct.stockActual - qty;
    let nuevoEstado = "OK";
    if (nuevoStock === 0) nuevoEstado = "AGOTADO";
    else if (nuevoStock <= selectedProduct.stockMinimo) nuevoEstado = "BAJO";

    const unitPrice = parseFloat(saleForm.precioVenta) || selectedProduct.precioVenta;
    const totalVenta = qty * unitPrice;

    setSaving(true);
    try {
      // A. Descontar stock del producto en Firestore
      await updateDoc(doc(db, "productos", selectedProduct.id), {
        stockActual: nuevoStock,
        estadoStock: nuevoEstado
      });

      // B. Guardar registro en la colección "ventas"
      const ventaDoc = await addDoc(collection(db, "ventas"), {
        numero: Date.now(),
        fecha: serverTimestamp(),
        usuarioId: profile?.uid || "anónimo",
        vendedorNombre: profile?.nombre || profile?.correo || "Vendedor",
        cliente: saleForm.cliente.trim() || "Cliente General",
        items: [
          {
            productoId: selectedProduct.id,
            nombre: selectedProduct.nombre,
            codigoBarras: selectedProduct.codigoBarras,
            cantidad: qty,
            precioUnitario: unitPrice,
            subtotal: totalVenta,
            seriales: saleForm.serialesVendidos ? saleForm.serialesVendidos.split(",").map(s => s.trim()) : []
          }
        ],
        total: totalVenta,
        estado: "COMPLETADA"
      });

      // C. Guardar registro en la colección "movimientos" (Kardex Auditoría)
      await addDoc(collection(db, "movimientos"), {
        productoId: selectedProduct.id,
        productoNombre: selectedProduct.nombre,
        tipo: "SALIDA",
        cantidad: qty,
        precioUnitario: unitPrice,
        stockAnterior: selectedProduct.stockActual,
        stockNuevo: nuevoStock,
        ventaId: ventaDoc.id,
        usuarioId: profile?.uid || "anónimo",
        vendedorNombre: profile?.nombre || profile?.correo || "Vendedor",
        fecha: serverTimestamp()
      });

      setShowSaleModal(false);
      setSelectedProduct(null);
      alert(`¡Venta realizada con éxito! Se descontaron ${qty} unidad(es). Stock restante: ${nuevoStock}`);
    } catch (err) {
      console.error("Error al procesar venta:", err);
      alert("Error al procesar venta: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 4. ABRIR MODAL PARA EDITAR PRODUCTO (ADMINISTRADOR)
  const openEditModal = (product) => {
    if (!isAdmin) {
      alert("Solo el Administrador tiene permiso para modificar productos.");
      return;
    }
    setEditingProduct(product);
    setEditForm({
      codigoBarras: product.codigoBarras || "",
      nombre: product.nombre || "",
      marca: product.marca || "",
      proveedorId: product.proveedorId || (suppliers[0]?.id || "prov_tecnoandina"),
      categoriaId: product.categoriaId || "cat_celulares",
      precioCompra: product.precioCompraFormateado || (product.precioCompra ? String(product.precioCompra) : ""),
      precioVenta: product.precioVentaFormateado || (product.precioVenta ? String(product.precioVenta) : ""),
      stockActual: product.stockActual ?? 0,
      stockMinimo: product.stockMinimo ?? 3,
      serializado: Boolean(product.serializado)
    });
    setShowEditModal(true);
  };

  // 5. GUARDAR CAMBIOS DE EDICIÓN DEL PRODUCTO (ADMINISTRADOR)
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Acceso denegado: Solo el Administrador puede realizar cambios.");
      return;
    }
    if (!editingProduct) return;

    if (!editForm.codigoBarras || !editForm.nombre || !editForm.precioCompra || !editForm.precioVenta) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    const nuevoStock = parseInt(editForm.stockActual) || 0;
    const nuevoMinStock = parseInt(editForm.stockMinimo) || 3;
    let nuevoEstado = "OK";
    if (nuevoStock === 0) nuevoEstado = "AGOTADO";
    else if (nuevoStock <= nuevoMinStock) nuevoEstado = "BAJO";

    const numCompra = parsePuntos(editForm.precioCompra);
    const numVenta = parsePuntos(editForm.precioVenta);

    setSaving(true);
    try {
      // 1. Actualizar producto en Firestore
      await updateDoc(doc(db, "productos", editingProduct.id), {
        codigoBarras: editForm.codigoBarras.trim(),
        nombre: editForm.nombre.trim(),
        nombreBusqueda: editForm.nombre.trim().toLowerCase(),
        marca: editForm.marca.trim() || "Genérico",
        proveedorId: editForm.proveedorId,
        categoriaId: editForm.categoriaId,
        serializado: Boolean(editForm.serializado),
        precioCompraFormateado: String(editForm.precioCompra).trim(),
        precioVentaFormateado: String(editForm.precioVenta).trim(),
        precioCompra: numCompra,
        precioVenta: numVenta,
        stockActual: nuevoStock,
        stockMinimo: nuevoMinStock,
        estadoStock: nuevoEstado,
        fechaActualizacion: serverTimestamp(),
        actualizadoPor: profile?.uid || "admin"
      });

      // 2. Si el stock fue modificado manualmente, registrar movimiento de AJUSTE para trazabilidad
      if (nuevoStock !== editingProduct.stockActual) {
        const diferencia = nuevoStock - editingProduct.stockActual;
        await addDoc(collection(db, "movimientos"), {
          productoId: editingProduct.id,
          productoNombre: editForm.nombre.trim(),
          tipo: "AJUSTE",
          cantidad: Math.abs(diferencia),
          precioUnitario: numVenta,
          stockAnterior: editingProduct.stockActual,
          stockNuevo: nuevoStock,
          usuarioId: profile?.uid || "admin",
          vendedorNombre: profile?.nombre || profile?.correo || "Administrador",
          fecha: serverTimestamp()
        });
      }

      setShowEditModal(false);
      setEditingProduct(null);
      alert("¡Producto modificado con éxito!");
    } catch (err) {
      console.error("Error al actualizar producto:", err);
      alert("Error al actualizar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 6. ELIMINAR PRODUCTO (ADMIN)
  const handleDeleteProduct = async (id) => {
    if (!isAdmin) {
      alert("Solo un Administrador puede eliminar productos.");
      return;
    }
    if (confirm("¿Seguro que deseas eliminar este producto del inventario?")) {
      try {
        await updateDoc(doc(db, "productos", id), { activo: false });
      } catch (err) {
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  // Filtro de búsqueda
  const filtered = products.filter(p => {
    const matchesSearch = 
      p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigoBarras?.includes(searchTerm);
    
    if (filterStatus === "OK") return matchesSearch && p.estadoStock === "OK";
    if (filterStatus === "BAJO") return matchesSearch && p.estadoStock === "BAJO";
    if (filterStatus === "AGOTADO") return matchesSearch && (p.estadoStock === "AGOTADO" || p.stockActual === 0);
    return matchesSearch;
  });

  return (
    <div className="page-body">
      {/* Sub-navegación: Catálogo vs Historial de Ventas vs Movimientos */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
        <button
          className={`btn ${activeSubTab === "catalogo" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveSubTab("catalogo")}
        >
          <Package size={17} /> Catálogo de Productos ({products.length})
        </button>
        <button
          className={`btn ${activeSubTab === "ventas" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveSubTab("ventas")}
        >
          <ShoppingCart size={17} /> Historial de Ventas ({salesHistory.length})
        </button>
        <button
          className={`btn ${activeSubTab === "movimientos" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveSubTab("movimientos")}
        >
          <History size={17} /> Kardex de Movimientos ({movementsHistory.length})
        </button>
      </div>

      {/* VISTA 1: CATÁLOGO DE PRODUCTOS */}
      {activeSubTab === "catalogo" && (
        <>
          {/* Top Action Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", gap: "12px", flex: 1, maxWidth: "560px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
                <input
                  type="text"
                  className="input-control"
                  style={{ paddingLeft: "42px" }}
                  placeholder="Buscar por nombre o escanear código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="input-control"
                style={{ width: "170px" }}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="TODOS">Todos los estados</option>
                <option value="OK">En Stock (OK)</option>
                <option value="BAJO">Bajo Stock</option>
                <option value="AGOTADO">Agotados</option>
              </select>
            </div>

            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={18} />
              Registrar Producto
            </button>
          </div>

          {/* Tabla de Productos */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código / Barras</th>
                    <th>Producto & Marca</th>
                    <th>Costo Compra</th>
                    <th>Precio Venta</th>
                    <th>Stock Actual</th>
                    <th>Estado</th>
                    <th>Acciones de Stock</th>
                    {isAdmin ? <th style={{ textAlign: "right" }}>Gestión Admin</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                        No se encontraron productos registrados.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "monospace", fontSize: "13px" }}>
                            <Barcode size={16} color="#64748b" />
                            <strong>{p.codigoBarras}</strong>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: "700", color: "#0f172a" }}>{p.nombre}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {`${p.marca || "Genérico"}${p.serializado ? " • Con Serial" : ""}`}
                          </div>
                        </td>
                        <td>
                          {/* Muestra el formato tal cual con puntos si existe */}
                          {`$${p.precioCompraFormateado || (p.precioCompra || 0).toLocaleString("es-CO")}`}
                        </td>
                        <td style={{ fontWeight: "700", color: "#2563eb" }}>
                          {`$${p.precioVentaFormateado || (p.precioVenta || 0).toLocaleString("es-CO")}`}
                        </td>
                        <td>
                          <span style={{ fontSize: "16px", fontWeight: "800", color: p.stockActual === 0 ? "#dc2626" : "#0f172a" }}>
                            {p.stockActual || 0}
                          </span>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>{` (Mín: ${p.stockMinimo || 3})`}</span>
                        </td>
                        <td>
                          <span className={`badge ${
                            p.estadoStock === "AGOTADO" || p.stockActual === 0
                              ? "badge-agotado"
                              : p.estadoStock === "BAJO" || p.stockActual <= p.stockMinimo
                              ? "badge-bajo"
                              : "badge-ok"
                          }`}>
                            {p.stockActual === 0 ? "AGOTADO" : p.estadoStock || "OK"}
                          </span>
                        </td>
                        <td>
                          {/* BOTÓN CLAVE: REGISTRAR VENTA Y DESCONTAR STOCK */}
                          <button
                            className="btn btn-primary"
                            style={{ 
                              padding: "7px 14px", 
                              fontSize: "13px",
                              backgroundColor: p.stockActual === 0 ? "#94a3b8" : "#16a34a" 
                            }}
                            onClick={() => openSaleModal(p)}
                            disabled={p.stockActual === 0}
                          >
                            <ShoppingCart size={15} />
                            Vender
                          </button>
                        </td>
                        {isAdmin ? (
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                              {/* Botón Editar Producto (Solo Administrador) */}
                              <button
                                onClick={() => openEditModal(p)}
                                style={{
                                  background: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  color: "#2563eb",
                                  cursor: "pointer",
                                  padding: "6px 12px",
                                  borderRadius: "8px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  fontSize: "12.5px",
                                  fontWeight: "600"
                                }}
                                title="Editar producto (Admin)"
                              >
                                <Edit2 size={14} /> Editar
                              </button>
                              {/* Botón Eliminar Producto */}
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                style={{
                                  background: "#fee2e2",
                                  border: "1px solid #fecaca",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  padding: "6px 12px",
                                  borderRadius: "8px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  fontSize: "12.5px",
                                  fontWeight: "600"
                                }}
                                title="Eliminar producto"
                              >
                                <Trash2 size={14} /> Eliminar
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VISTA 2: HISTORIAL DE VENTAS */}
      {activeSubTab === "ventas" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: "700", margin: "0 0 4px 0" }}>Historial de Ventas Realizadas</h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                Registro de cada venta con productos facturados, unidades descontadas y vendedor a cargo.
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha & Hora</th>
                  <th>Cliente</th>
                  <th>Productos Vendidos</th>
                  <th>Total Facturado</th>
                  <th>Vendedor</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      Aún no se han registrado ventas. Ve al catálogo y presiona "Vender" en cualquier producto.
                    </td>
                  </tr>
                ) : (
                  salesHistory.map(sale => {
                    const fechaObj = sale.fecha?.toDate ? sale.fecha.toDate() : new Date();
                    return (
                      <tr key={sale.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                            <Calendar size={14} color="#64748b" />
                            <span>{fechaObj.toLocaleString("es-CO")}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: "600" }}>{sale.cliente || "Consumidor Final"}</div>
                        </td>
                        <td>
                          {sale.items?.map((item, idx) => (
                            <div key={idx} style={{ fontSize: "13px", color: "#1e293b" }}>
                              <strong>{item.cantidad}x</strong> {item.nombre}
                            </div>
                          ))}
                        </td>
                        <td>
                          <strong style={{ color: "#16a34a", fontSize: "15px" }}>
                            ${(sale.total || 0).toLocaleString("es-CO")}
                          </strong>
                        </td>
                        <td>
                          <span style={{ fontSize: "13px", color: "#475569" }}>
                            {sale.vendedorNombre || "Vendedor"}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-ok">COMPLETADA</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 3: KARDEX DE MOVIMIENTOS (AUDITORÍA) */}
      {activeSubTab === "movimientos" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "17px", fontWeight: "700", margin: "0 0 4px 0" }}>Kardex de Movimientos de Inventario</h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
              Auditoría inmutable de cada entrada y salida con stock anterior y nuevo.
            </p>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Stock Anterior</th>
                  <th>Stock Resultante</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {movementsHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                      No hay movimientos registrados en el kardex todavía.
                    </td>
                  </tr>
                ) : (
                  movementsHistory.map(mov => {
                    const fechaObj = mov.fecha?.toDate ? mov.fecha.toDate() : new Date();
                    return (
                      <tr key={mov.id}>
                        <td>{fechaObj.toLocaleString("es-CO")}</td>
                        <td>
                          <span className={`badge ${mov.tipo === "ENTRADA" ? "badge-ok" : "badge-bajo"}`}>
                            {mov.tipo}
                          </span>
                        </td>
                        <td><strong>{mov.productoNombre}</strong></td>
                        <td><strong>{mov.cantidad} unid.</strong></td>
                        <td>{mov.stockAnterior}</td>
                        <td style={{ fontWeight: "700", color: "#2563eb" }}>{mov.stockNuevo}</td>
                        <td>{mov.vendedorNombre || mov.usuarioId}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRAR PRODUCTO (Acepta puntos en los campos numéricos) */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "6px" }}>
              Registrar Nuevo Producto en Inventario
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px" }}>
              Puedes colocar puntos libremente (ej: <code>650.000</code> o códigos como <code>770.123.456</code>).
            </p>

            <form onSubmit={handleCreateProduct}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="input-group">
                  <label className="input-label">Código de Barras / Serial *</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="770.123.456.789"
                    value={form.codigoBarras}
                    onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Marca</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Samsung, Xiaomi, Apple..."
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Nombre del Producto *</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Samsung Galaxy A15 128 GB Negro"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="input-group">
                  <label className="input-label">Precio de Compra (Costo COP) *</label>
                  {/* Tipo texto para permitir escribir varios puntos tal cual */}
                  <input
                    type="text"
                    className="input-control"
                    placeholder="650.000"
                    value={form.precioCompra}
                    onChange={(e) => setForm({ ...form, precioCompra: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Precio de Venta (PVP COP) *</label>
                  {/* Tipo texto para permitir escribir varios puntos tal cual */}
                  <input
                    type="text"
                    className="input-control"
                    placeholder="799.000"
                    value={form.precioVenta}
                    onChange={(e) => setForm({ ...form, precioVenta: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="input-group">
                  <label className="input-label">Stock Inicial (Unidades) *</label>
                  <input
                    type="number"
                    className="input-control"
                    placeholder="10"
                    value={form.stockActual}
                    onChange={(e) => setForm({ ...form, stockActual: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Stock Mínimo (Alerta) *</label>
                  <input
                    type="number"
                    className="input-control"
                    placeholder="3"
                    value={form.stockMinimo}
                    onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Proveedor</label>
                <select
                  className="input-control"
                  value={form.proveedorId}
                  onChange={(e) => setForm({ ...form, proveedorId: e.target.value })}
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                  {suppliers.length === 0 && (
                    <option value="prov_tecnoandina">Distribuidora TecnoAndina S.A.S.</option>
                  )}
                </select>
              </div>

              <div className="input-group" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                <input
                  type="checkbox"
                  id="serializadoCheck"
                  checked={form.serializado}
                  onChange={(e) => setForm({ ...form, serializado: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="serializadoCheck" style={{ fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                  Este producto maneja Serial individual o IMEI (ej: celulares)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR VENTA Y DESCONTAR STOCK */}
      {showSaleModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#dcfce7",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <ShoppingCart size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: 0 }}>Registrar Venta</h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Descuenta stock automáticamente y genera historial</p>
              </div>
            </div>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px", marginBottom: "18px" }}>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>{selectedProduct.nombre}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "13px", color: "#475569" }}>
                <span>Stock Disponible: <strong style={{ color: "#16a34a" }}>{selectedProduct.stockActual} unidades</strong></span>
                <span>Precio Unitario: <strong>${(selectedProduct.precioVenta || 0).toLocaleString("es-CO")}</strong></span>
              </div>
            </div>

            <form onSubmit={handleConfirmSale}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="input-group">
                  <label className="input-label">Cantidad a Vender *</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct.stockActual}
                    className="input-control"
                    value={saleForm.cantidad}
                    onChange={(e) => setSaleForm({ ...saleForm, cantidad: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Cliente (Opcional)</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Carlos Ruiz / 10203040"
                    value={saleForm.cliente}
                    onChange={(e) => setSaleForm({ ...saleForm, cliente: e.target.value })}
                  />
                </div>
              </div>

              {selectedProduct.serializado && (
                <div className="input-group">
                  <label className="input-label">Seriales / IMEI Vendidos (Separados por coma)</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Ej: R58W12ABC34, R58W12ABC35"
                    value={saleForm.serialesVendidos}
                    onChange={(e) => setSaleForm({ ...saleForm, serialesVendidos: e.target.value })}
                  />
                </div>
              )}

              {/* Total Card */}
              <div style={{
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px"
              }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#1e40af" }}>Total a Cobrar:</span>
                <span style={{ fontSize: "22px", fontWeight: "800", color: "#1d4ed8" }}>
                  ${((parseInt(saleForm.cantidad) || 0) * (selectedProduct.precioVenta || 0)).toLocaleString("es-CO")}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSaleModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ backgroundColor: "#16a34a" }}
                >
                  {saving ? "Procesando..." : "Confirmar Venta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDITAR PRODUCTO (EXCLUSIVO ADMINISTRADOR) */}
      {showEditModal && editingProduct && isAdmin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Edit2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: 0 }}>
                  Modificar Producto (Admin)
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                  Actualiza precios, cantidades de stock o datos del catálogo
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProduct} style={{ marginTop: "18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="input-group">
                  <label className="input-label">Código de Barras / Serial *</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="770.123.456.789"
                    value={editForm.codigoBarras}
                    onChange={(e) => setEditForm({ ...editForm, codigoBarras: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Marca</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Samsung, Xiaomi, Apple..."
                    value={editForm.marca}
                    onChange={(e) => setEditForm({ ...editForm, marca: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Nombre del Producto *</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Samsung Galaxy A15 128 GB Negro"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="input-group">
                  <label className="input-label">Precio de Compra (Costo COP) *</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="650.000"
                    value={editForm.precioCompra}
                    onChange={(e) => setEditForm({ ...editForm, precioCompra: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Precio de Venta (PVP COP) *</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="799.000"
                    value={editForm.precioVenta}
                    onChange={(e) => setEditForm({ ...editForm, precioVenta: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="input-group">
                  <label className="input-label">Stock Actual (Existencias) *</label>
                  <input
                    type="number"
                    className="input-control"
                    placeholder="10"
                    value={editForm.stockActual}
                    onChange={(e) => setEditForm({ ...editForm, stockActual: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Stock Mínimo (Alerta) *</label>
                  <input
                    type="number"
                    className="input-control"
                    placeholder="3"
                    value={editForm.stockMinimo}
                    onChange={(e) => setEditForm({ ...editForm, stockMinimo: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Proveedor Principal</label>
                <select
                  className="input-control"
                  value={editForm.proveedorId}
                  onChange={(e) => setEditForm({ ...editForm, proveedorId: e.target.value })}
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                  {suppliers.length === 0 && (
                    <option value="prov_tecnoandina">Distribuidora TecnoAndina S.A.S.</option>
                  )}
                </select>
              </div>

              <div className="input-group" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                <input
                  type="checkbox"
                  id="serializadoEditCheck"
                  checked={editForm.serializado}
                  onChange={(e) => setEditForm({ ...editForm, serializado: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="serializadoEditCheck" style={{ fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                  Este producto maneja Serial individual o IMEI (ej: celulares)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProduct(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
