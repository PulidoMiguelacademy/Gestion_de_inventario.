import React, { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Barcode,
  Plus,
  ShoppingCart,
  Search,
  Calendar,
  Truck,
  Package,
  Hash,
  User,
  CheckCircle2,
  Trash2,
  Filter,
  FileText,
  Sparkles
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

export default function Movements() {
  const { profile } = useAuth();

  // Pestañas / Vistas dentro del módulo S7:
  // "historial" (Tarea 08) | "entrada" (Tarea 07) | "venta" (Tarea 09)
  const [activeView, setActiveView] = useState("historial");

  // Datos desde Firestore en tiempo real
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [saving, setSaving] = useState(false);

  // Filtros para Tarea 08 (Consultar historial de movimientos)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("TODOS"); // TODOS | ENTRADA | SALIDA | AJUSTE
  const [filterDate, setFilterDate] = useState("");

  // =========================================================================
  // ESTADO TAREA 07: REGISTRAR ENTRADA (Seriales, Proveedor, Fecha)
  // =========================================================================
  const todayStr = new Date().toISOString().split("T")[0];
  const [entryForm, setEntryForm] = useState({
    codigoEscaneado: "",
    productoId: "",
    proveedorId: "",
    fechaEntrada: todayStr,
    cantidad: 1,
    costoUnitario: "",
    serialInput: "",
    serialesLista: [],
    observaciones: ""
  });

  // =========================================================================
  // ESTADO TAREA 09: REGISTRAR VENTA (Escáner, Uno o Varios Productos y Seriales)
  // =========================================================================
  const [scannerInput, setScannerInput] = useState("");
  const [selectedProdToAdd, setSelectedProdToAdd] = useState("");
  const [saleDate, setSaleDate] = useState(todayStr);
  const [clienteVenta, setClienteVenta] = useState("");
  const [cartItems, setCartItems] = useState([]); // [{ product, cantidad, precioUnitario, serialesTexto }]

  useEffect(() => {
    // 1. Escuchar productos
    const unsubProds = onSnapshot(
      collection(db, "productos"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.activo !== false);
        setProducts(list);
      },
      (err) => console.warn("Aviso productos:", err)
    );

    // 2. Escuchar proveedores
    const unsubSupps = onSnapshot(
      collection(db, "proveedores"),
      (snap) => {
        setSuppliers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.warn("Aviso proveedores:", err)
    );

    // 3. Escuchar movimientos (Kardex)
    const qMovs = query(collection(db, "movimientos"), orderBy("fecha", "desc"));
    const unsubMovs = onSnapshot(
      qMovs,
      (snap) => {
        setMovements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.warn("Aviso movimientos:", err)
    );

    return () => {
      unsubProds();
      unsubSupps();
      unsubMovs();
    };
  }, []);

  // Seleccionar valores por defecto cuando cargan productos y proveedores
  useEffect(() => {
    if (products.length > 0 && !entryForm.productoId) {
      const first = products[0];
      setEntryForm((prev) => ({
        ...prev,
        productoId: first.id,
        costoUnitario: first.precioCompraFormateado || String(first.precioCompra || "")
      }));
    }
  }, [products]);

  useEffect(() => {
    if (suppliers.length > 0 && !entryForm.proveedorId) {
      setEntryForm((prev) => ({ ...prev, proveedorId: suppliers[0].id }));
    }
  }, [suppliers]);

  // Función auxiliar para limpiar puntos de miles
  const parsePuntos = (valorStr) => {
    if (typeof valorStr === "number") return valorStr;
    if (!valorStr) return 0;
    const sinPuntos = String(valorStr).replace(/\./g, "").replace(/,/g, ".");
    return parseFloat(sinPuntos) || 0;
  };

  // =========================================================================
  // LÓGICA TAREA 07: REGISTRAR ENTRADA DE PRODUCTOS
  // =========================================================================
  const handleScanEntryBarcode = (code) => {
    setEntryForm((prev) => ({ ...prev, codigoEscaneado: code }));
    if (!code.trim()) return;
    const found = products.find(
      (p) =>
        p.codigoBarras?.toLowerCase() === code.trim().toLowerCase() ||
        p.nombre?.toLowerCase().includes(code.trim().toLowerCase())
    );
    if (found) {
      setEntryForm((prev) => ({
        ...prev,
        codigoEscaneado: code,
        productoId: found.id,
        costoUnitario: found.precioCompraFormateado || String(found.precioCompra || "")
      }));
    }
  };

  const handleAddSerialToEntry = () => {
    const raw = entryForm.serialInput.trim();
    if (!raw) return;
    // Permitir pegar varios seriales separados por coma o espacio
    const nuevos = raw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !entryForm.serialesLista.includes(s));

    if (nuevos.length === 0) {
      alert("Este serial ya fue agregado a la lista de entrada.");
      return;
    }

    const updatedList = [...entryForm.serialesLista, ...nuevos];
    setEntryForm((prev) => ({
      ...prev,
      serialesLista: updatedList,
      serialInput: "",
      // Si la cantidad era menor que el número de seriales escaneados, ajustarla automáticamente
      cantidad: Math.max(parseInt(prev.cantidad) || 1, updatedList.length)
    }));
  };

  const handleRemoveSerialFromEntry = (serialToRemove) => {
    setEntryForm((prev) => ({
      ...prev,
      serialesLista: prev.serialesLista.filter((s) => s !== serialToRemove)
    }));
  };

  const handleSubmitEntry = async (e) => {
    e.preventDefault();
    const targetProduct = products.find((p) => p.id === entryForm.productoId);
    if (!targetProduct) {
      alert("Por favor selecciona un producto válido.");
      return;
    }

    const qty = parseInt(entryForm.cantidad) || 0;
    if (qty <= 0) {
      alert("La cantidad de entrada debe ser mayor a 0.");
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === entryForm.proveedorId);
    const proveedorNombre = selectedSupplier
      ? selectedSupplier.nombre
      : "Distribuidora TecnoAndina S.A.S.";

    // Si dejó texto en el campo de serial sin pulsar '+', lo incluimos también
    let finalSerials = [...entryForm.serialesLista];
    if (entryForm.serialInput.trim()) {
      const extras = entryForm.serialInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !finalSerials.includes(s));
      finalSerials = [...finalSerials, ...extras];
    }

    const stockAnterior = targetProduct.stockActual || 0;
    const stockNuevo = stockAnterior + qty;
    const minStock = targetProduct.stockMinimo || 3;
    let nuevoEstado = "OK";
    if (stockNuevo === 0) nuevoEstado = "AGOTADO";
    else if (stockNuevo <= minStock) nuevoEstado = "BAJO";

    const serialesPrevios = Array.isArray(targetProduct.serialesDisponibles)
      ? targetProduct.serialesDisponibles
      : [];
    const serialesActualizados = [...serialesPrevios, ...finalSerials];

    setSaving(true);
    try {
      // 1. Sumar stock al producto en Firestore
      await updateDoc(doc(db, "productos", targetProduct.id), {
        stockActual: stockNuevo,
        estadoStock: nuevoEstado,
        proveedorId: entryForm.proveedorId || targetProduct.proveedorId || "prov_tecnoandina",
        serialesDisponibles: serialesActualizados,
        ultimaEntradaFecha: entryForm.fechaEntrada
      });

      // 2. Registrar el movimiento de ENTRADA en el Kardex ("movimientos")
      await addDoc(collection(db, "movimientos"), {
        productoId: targetProduct.id,
        productoNombre: targetProduct.nombre,
        codigoBarras: targetProduct.codigoBarras || "",
        tipo: "ENTRADA",
        cantidad: qty,
        costoUnitario: parsePuntos(entryForm.costoUnitario) || targetProduct.precioCompra || 0,
        stockAnterior: stockAnterior,
        stockNuevo: stockNuevo,
        proveedorId: entryForm.proveedorId || "prov_tecnoandina",
        proveedorNombre: proveedorNombre,
        seriales: finalSerials,
        fechaOperacion: entryForm.fechaEntrada,
        observaciones: entryForm.observaciones.trim() || "Recepción de mercancía",
        usuarioId: profile?.uid || "admin",
        vendedorNombre: profile?.nombre || profile?.correo || "Colaborador",
        fecha: serverTimestamp()
      });

      alert(
        `✅ ¡Entrada registrada con éxito!\n\n` +
          `Producto: ${targetProduct.nombre}\n` +
          `Proveedor: ${proveedorNombre}\n` +
          `Unidades sumadas: +${qty}\n` +
          `Nuevo Stock Disponible: ${stockNuevo} unidades`
      );

      // Limpiar formulario y llevar al historial para ver el registro
      setEntryForm((prev) => ({
        ...prev,
        codigoEscaneado: "",
        cantidad: 1,
        serialInput: "",
        serialesLista: [],
        observaciones: ""
      }));
      setActiveView("historial");
    } catch (err) {
      console.error("Error registrando entrada:", err);
      alert("Error al registrar entrada: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // LÓGICA TAREA 09: REGISTRAR VENTA (Escáner y Seriales)
  // =========================================================================
  const addProductToSaleCart = (productObj) => {
    if (!productObj) return;
    if ((productObj.stockActual || 0) <= 0) {
      alert(`El producto "${productObj.nombre}" está AGOTADO (Stock: 0).`);
      return;
    }

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === productObj.id);
      if (existingIndex >= 0) {
        const currentQty = prev[existingIndex].cantidad;
        if (currentQty + 1 > productObj.stockActual) {
          alert(`Solo hay ${productObj.stockActual} unidades disponibles de ${productObj.nombre}.`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          cantidad: currentQty + 1
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product: productObj,
            cantidad: 1,
            precioUnitario: productObj.precioVenta || 0,
            serialesTexto: ""
          }
        ];
      }
    });
  };

  const handleBarcodeScannerSubmit = (e) => {
    e.preventDefault();
    const code = scannerInput.trim();
    if (!code) return;

    const matched = products.find(
      (p) =>
        p.codigoBarras?.toLowerCase() === code.toLowerCase() ||
        p.nombre?.toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      addProductToSaleCart(matched);
      setScannerInput("");
    } else {
      alert(`No se encontró ningún producto con el código o nombre: "${code}"`);
    }
  };

  const handleUpdateCartItem = (productId, field, value) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        if (field === "cantidad") {
          const maxStock = item.product.stockActual || 1;
          const val = Math.max(1, Math.min(maxStock, parseInt(value) || 1));
          return { ...item, cantidad: val };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleRemoveCartItem = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalVentaCarrito = cartItems.reduce(
    (acc, item) => acc + item.cantidad * (parseFloat(item.precioUnitario) || 0),
    0
  );

  const handleConfirmMultiSale = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert("Agrega al menos un producto a la venta usando el escáner o el selector.");
      return;
    }

    // Validar stock de cada ítem
    for (const item of cartItems) {
      if (item.cantidad > (item.product.stockActual || 0)) {
        alert(
          `Stock insuficiente para "${item.product.nombre}". Disponibles: ${item.product.stockActual}`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const itemsPayload = cartItems.map((item) => {
        const serialsArr = item.serialesTexto
          ? item.serialesTexto
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        return {
          productoId: item.product.id,
          nombre: item.product.nombre,
          codigoBarras: item.product.codigoBarras || "",
          cantidad: item.cantidad,
          precioUnitario: parseFloat(item.precioUnitario) || 0,
          subtotal: item.cantidad * (parseFloat(item.precioUnitario) || 0),
          seriales: serialsArr
        };
      });

      // 1. Crear documento de Venta en "ventas"
      const ventaRef = await addDoc(collection(db, "ventas"), {
        numero: Date.now(),
        fecha: serverTimestamp(),
        fechaVenta: saleDate,
        usuarioId: profile?.uid || "operador",
        vendedorNombre: profile?.nombre || profile?.correo || "Vendedor",
        cliente: clienteVenta.trim() || "Cliente Mostrador",
        items: itemsPayload,
        total: totalVentaCarrito,
        estado: "COMPLETADA"
      });

      // 2. Por cada producto vendido: descontar stock y crear movimiento de SALIDA en Kardex
      for (const item of cartItems) {
        const prod = item.product;
        const stockAnt = prod.stockActual || 0;
        const stockNue = Math.max(0, stockAnt - item.cantidad);
        const minStock = prod.stockMinimo || 3;
        let estado = "OK";
        if (stockNue === 0) estado = "AGOTADO";
        else if (stockNue <= minStock) estado = "BAJO";

        const serialesVendidos = item.serialesTexto
          ? item.serialesTexto
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        // Remover seriales vendidos de los disponibles si estaban registrados
        const dispActuales = Array.isArray(prod.serialesDisponibles)
          ? prod.serialesDisponibles
          : [];
        const dispRestantes = dispActuales.filter((s) => !serialesVendidos.includes(s));

        await updateDoc(doc(db, "productos", prod.id), {
          stockActual: stockNue,
          estadoStock: estado,
          serialesDisponibles: dispRestantes
        });

        await addDoc(collection(db, "movimientos"), {
          productoId: prod.id,
          productoNombre: prod.nombre,
          codigoBarras: prod.codigoBarras || "",
          tipo: "SALIDA",
          cantidad: item.cantidad,
          precioUnitario: parseFloat(item.precioUnitario) || 0,
          stockAnterior: stockAnt,
          stockNuevo: stockNue,
          ventaId: ventaRef.id,
          cliente: clienteVenta.trim() || "Cliente Mostrador",
          seriales: serialesVendidos,
          fechaOperacion: saleDate,
          observaciones: `Venta facturada a ${clienteVenta.trim() || "Cliente Mostrador"}`,
          usuarioId: profile?.uid || "operador",
          vendedorNombre: profile?.nombre || profile?.correo || "Vendedor",
          fecha: serverTimestamp()
        });
      }

      alert(
        `✅ ¡Venta registrada exitosamente!\n\n` +
          `Productos vendidos: ${cartItems.length}\n` +
          `Total facturado: $${totalVentaCarrito.toLocaleString("es-CO")}\n` +
          `El stock se descontó y el movimiento quedó registrado en el historial.`
      );

      setCartItems([]);
      setClienteVenta("");
      setScannerInput("");
      setActiveView("historial");
    } catch (err) {
      console.error("Error registrando venta:", err);
      alert("Error al procesar la venta: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // FILTRADO PARA TAREA 08: CONSULTAR HISTORIAL DE MOVIMIENTOS
  // =========================================================================
  const filteredMovements = movements.filter((m) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      m.productoNombre?.toLowerCase().includes(term) ||
      m.codigoBarras?.toLowerCase().includes(term) ||
      m.proveedorNombre?.toLowerCase().includes(term) ||
      m.cliente?.toLowerCase().includes(term) ||
      m.vendedorNombre?.toLowerCase().includes(term) ||
      (Array.isArray(m.seriales) && m.seriales.some((s) => s.toLowerCase().includes(term)));

    const matchesType = filterType === "TODOS" || m.tipo === filterType;

    let matchesDate = true;
    if (filterDate) {
      if (m.fechaOperacion) {
        matchesDate = m.fechaOperacion === filterDate;
      } else if (m.fecha?.toDate) {
        const dStr = m.fecha.toDate().toISOString().split("T")[0];
        matchesDate = dStr === filterDate;
      }
    }

    return matchesSearch && matchesType && matchesDate;
  });

  const totalEntradas = movements
    .filter((m) => m.tipo === "ENTRADA")
    .reduce((acc, m) => acc + (m.cantidad || 0), 0);

  const totalSalidas = movements
    .filter((m) => m.tipo === "SALIDA")
    .reduce((acc, m) => acc + (m.cantidad || 0), 0);

  const selectedProductForEntry = products.find((p) => p.id === entryForm.productoId);

  return (
    <div className="page-body">
      {/* Banner superior del módulo */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "20px",
          padding: "24px 30px",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span
              style={{
                backgroundColor: "#dbeafe",
                color: "#1d4ed8",
                fontSize: "11.5px",
                fontWeight: "800",
                padding: "4px 10px",
                borderRadius: "999px",
                textTransform: "uppercase"
              }}
            >
              Kardex • Control de Inventario y Ventas
            </span>
          </div>
          <h2 style={{ fontSize: "21px", fontWeight: "800", color: "#0f172a", margin: "0 0 4px 0" }}>
            Historial de Movimientos, Entradas y Ventas
          </h2>
          <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0 }}>
            Registra ingresos de mercancía con seriales y proveedor, consulta el historial de auditoría y procesa ventas con lector de código de barras.
          </p>
        </div>

        {/* Botones de navegación */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className={`btn ${activeView === "historial" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveView("historial")}
          >
            <ArrowLeftRight size={17} />
            Historial de Movimientos ({movements.length})
          </button>

          <button
            className="btn"
            style={{
              backgroundColor: activeView === "entrada" ? "#16a34a" : "#f0fdf4",
              color: activeView === "entrada" ? "white" : "#15803d",
              border: "1px solid #bbf7d0",
              fontWeight: "700"
            }}
            onClick={() => setActiveView("entrada")}
          >
            <ArrowDownLeft size={17} />
            + Registrar Entrada
          </button>

          <button
            className="btn"
            style={{
              backgroundColor: activeView === "venta" ? "#ea580c" : "#fff7ed",
              color: activeView === "venta" ? "white" : "#c2410c",
              border: "1px solid #fed7aa",
              fontWeight: "700"
            }}
            onClick={() => setActiveView("venta")}
          >
            <Barcode size={17} />
            Registrar Venta
          </button>
        </div>
      </div>

      {/* =====================================================================
          VISTA 1: CONSULTAR HISTORIAL DE MOVIMIENTOS
         ===================================================================== */}
      {activeView === "historial" && (
        <>
          {/* Tarjetas de resumen rápido */}
          <div className="metric-grid" style={{ marginBottom: "24px" }}>
            <div className="card metric-card">
              <div>
                <span className="metric-label">Total Movimientos Registrados</span>
                <div className="metric-value">{movements.length}</div>
              </div>
              <div className="metric-icon-box" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                <ArrowLeftRight size={24} />
              </div>
            </div>

            <div className="card metric-card">
              <div>
                <span className="metric-label">Unidades Ingresadas (Entradas)</span>
                <div className="metric-value" style={{ color: "#16a34a" }}>
                  +{totalEntradas}
                </div>
              </div>
              <div className="metric-icon-box" style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}>
                <ArrowDownLeft size={24} />
              </div>
            </div>

            <div className="card metric-card">
              <div>
                <span className="metric-label">Unidades Despachadas (Salidas)</span>
                <div className="metric-value" style={{ color: "#ea580c" }}>
                  -{totalSalidas}
                </div>
              </div>
              <div className="metric-icon-box" style={{ backgroundColor: "#fff7ed", color: "#ea580c" }}>
                <ArrowUpRight size={24} />
              </div>
            </div>
          </div>

          {/* Barra de búsqueda y filtros del historial */}
          <div className="card" style={{ marginBottom: "20px", padding: "18px 24px" }}>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
                <Search size={18} style={{ position: "absolute", left: "14px", top: "13px", color: "#94a3b8" }} />
                <input
                  type="text"
                  className="input-control"
                  style={{ paddingLeft: "42px" }}
                  placeholder="Buscar por producto, serial/IMEI, proveedor, cliente o responsable..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Filter size={16} color="#64748b" />
                <select
                  className="input-control"
                  style={{ width: "190px" }}
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="TODOS">Todos los tipos</option>
                  <option value="ENTRADA">Solo Entradas (+)</option>
                  <option value="SALIDA">Solo Salidas / Ventas (-)</option>
                  <option value="AJUSTE">Ajustes de Inventario</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar size={16} color="#64748b" />
                <input
                  type="date"
                  className="input-control"
                  style={{ width: "165px" }}
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
                {filterDate && (
                  <button
                    className="btn btn-secondary"
                    style={{ padding: "8px 12px", fontSize: "12px" }}
                    onClick={() => setFilterDate("")}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabla de Historial de Movimientos */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 2px 0" }}>
                  Historial Detallado de Movimientos (Kardex)
                </h3>
                <p style={{ fontSize: "12.5px", color: "#64748b", margin: 0 }}>
                  Muestra cada movimiento realizado indicando producto, cantidad, tipo (entrada/salida), proveedor/cliente y seriales.
                </p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Movimiento</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Stock (Ant ➔ Nuevo)</th>
                    <th>Proveedor / Cliente</th>
                    <th>Seriales / IMEIs</th>
                    <th>Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "44px", color: "#64748b" }}>
                        No se encontraron movimientos con los filtros seleccionados. Usa los botones superiores para registrar una Entrada o una Venta.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((mov) => {
                      const fechaObj = mov.fecha?.toDate ? mov.fecha.toDate() : new Date();
                      const isEntrada = mov.tipo === "ENTRADA";
                      const isSalida = mov.tipo === "SALIDA";
                      const serialsList = Array.isArray(mov.seriales) ? mov.seriales : [];

                      return (
                        <tr key={mov.id}>
                          <td style={{ whiteSpace: "nowrap", fontSize: "13px" }}>
                            <div style={{ fontWeight: "600", color: "#0f172a" }}>
                              {mov.fechaOperacion || fechaObj.toLocaleDateString("es-CO")}
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                              {fechaObj.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>

                          <td>
                            <span
                              className={`badge ${
                                isEntrada ? "badge-ok" : isSalida ? "badge-agotado" : "badge-bajo"
                              }`}
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              {isEntrada && <ArrowDownLeft size={13} />}
                              {isSalida && <ArrowUpRight size={13} />}
                              {mov.tipo || "MOVIMIENTO"}
                            </span>
                          </td>

                          <td>
                            <div style={{ fontWeight: "700", color: "#0f172a" }}>{mov.productoNombre}</div>
                            {mov.codigoBarras && (
                              <div style={{ fontSize: "11.5px", color: "#64748b", fontFamily: "monospace" }}>
                                Cód: {mov.codigoBarras}
                              </div>
                            )}
                          </td>

                          <td>
                            <span
                              style={{
                                fontWeight: "800",
                                fontSize: "15px",
                                color: isEntrada ? "#16a34a" : isSalida ? "#dc2626" : "#2563eb"
                              }}
                            >
                              {isEntrada ? `+${mov.cantidad}` : isSalida ? `-${mov.cantidad}` : mov.cantidad} unid.
                            </span>
                          </td>

                          <td style={{ fontSize: "13px" }}>
                            <span style={{ color: "#64748b" }}>{mov.stockAnterior ?? "-"}</span>
                            <span style={{ margin: "0 6px", color: "#94a3b8" }}>➔</span>
                            <strong style={{ color: "#0f172a" }}>{mov.stockNuevo ?? "-"}</strong>
                          </td>

                          <td style={{ fontSize: "13px" }}>
                            {isEntrada ? (
                              <div>
                                <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700" }}>
                                  PROVEEDOR:
                                </span>
                                <div style={{ fontWeight: "600" }}>{mov.proveedorNombre || "Proveedor Oficial"}</div>
                              </div>
                            ) : isSalida ? (
                              <div>
                                <span style={{ fontSize: "11px", color: "#ea580c", fontWeight: "700" }}>
                                  CLIENTE:
                                </span>
                                <div style={{ fontWeight: "600" }}>{mov.cliente || "Cliente General"}</div>
                              </div>
                            ) : (
                              <span style={{ color: "#64748b" }}>{mov.observaciones || "Ajuste interno"}</span>
                            )}
                          </td>

                          <td>
                            {serialsList.length > 0 ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "220px" }}>
                                {serialsList.map((ser, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      backgroundColor: "#f1f5f9",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "6px",
                                      padding: "2px 6px",
                                      fontSize: "11px",
                                      fontFamily: "monospace",
                                      fontWeight: "600",
                                      color: "#334155"
                                    }}
                                  >
                                    {ser}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Sin seriales</span>
                            )}
                          </td>

                          <td style={{ fontSize: "13px", color: "#475569" }}>
                            {mov.vendedorNombre || "Colaborador"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          VISTA 2: REGISTRAR ENTRADA (Seriales, Proveedor, Fecha)
         ===================================================================== */}
      {activeView === "entrada" && (
        <div className="card" style={{ maxWidth: "820px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              paddingBottom: "18px",
              marginBottom: "22px",
              borderBottom: "1px solid var(--border)"
            }}
          >
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                backgroundColor: "#dcfce7",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <ArrowDownLeft size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                Registrar Entrada de Productos al Inventario
              </h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                Selecciona el producto, asigna el proveedor, registra la fecha y los seriales recibidos. La cantidad se sumará automáticamente al stock actual.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitEntry}>
            {/* Paso rápido opcional: Escanear código de barras */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                padding: "16px",
                borderRadius: "12px",
                border: "1px dashed #cbd5e1",
                marginBottom: "20px"
              }}
            >
              <label className="input-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Barcode size={16} color="#2563eb" />
                Escáner Rápido de Código de Barras (Opcional)
              </label>
              <input
                type="text"
                className="input-control"
                placeholder="Pasa el lector de código de barras aquí para seleccionar el producto automáticamente..."
                value={entryForm.codigoEscaneado}
                onChange={(e) => handleScanEntryBarcode(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
              {/* Selección de Producto */}
              <div className="input-group">
                <label className="input-label">1. Seleccionar Producto *</label>
                <select
                  className="input-control"
                  value={entryForm.productoId}
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === e.target.value);
                    setEntryForm({
                      ...entryForm,
                      productoId: e.target.value,
                      costoUnitario: prod
                        ? prod.precioCompraFormateado || String(prod.precioCompra || "")
                        : ""
                    });
                  }}
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock actual: {p.stockActual || 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selección de Proveedor */}
              <div className="input-group">
                <label className="input-label">2. Proveedor que entrega *</label>
                <select
                  className="input-control"
                  value={entryForm.proveedorId}
                  onChange={(e) => setEntryForm({ ...entryForm, proveedorId: e.target.value })}
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} (NIT: {s.nit})
                    </option>
                  ))}
                  {suppliers.length === 0 && (
                    <option value="prov_tecnoandina">Distribuidora TecnoAndina S.A.S.</option>
                  )}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "18px" }}>
              {/* Cantidad Ingresada */}
              <div className="input-group">
                <label className="input-label">3. Cantidad que Ingresa *</label>
                <input
                  type="number"
                  min="1"
                  className="input-control"
                  value={entryForm.cantidad}
                  onChange={(e) => setEntryForm({ ...entryForm, cantidad: e.target.value })}
                  required
                />
              </div>

              {/* Fecha de Entrada */}
              <div className="input-group">
                <label className="input-label">4. Fecha de Entrada *</label>
                <input
                  type="date"
                  className="input-control"
                  value={entryForm.fechaEntrada}
                  onChange={(e) => setEntryForm({ ...entryForm, fechaEntrada: e.target.value })}
                  required
                />
              </div>

              {/* Costo Unitario */}
              <div className="input-group">
                <label className="input-label">Costo Unitario (COP)</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="650.000"
                  value={entryForm.costoUnitario}
                  onChange={(e) => setEntryForm({ ...entryForm, costoUnitario: e.target.value })}
                />
              </div>
            </div>

            {/* Registro de Seriales / IMEI */}
            <div
              style={{
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "18px"
              }}
            >
              <label className="input-label" style={{ color: "#166534", fontWeight: "700" }}>
                5. Registro de Seriales / IMEI de las unidades recibidas
              </label>
              <p style={{ fontSize: "12px", color: "#15803d", margin: "0 0 10px 0" }}>
                Escanea o escribe cada serial y presiona <strong>"Agregar Serial"</strong> (también puedes separarlos por coma).
              </p>

              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Ej: SN-99887766, IMEI-35489102..."
                  value={entryForm.serialInput}
                  onChange={(e) => setEntryForm({ ...entryForm, serialInput: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSerialToEntry();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ backgroundColor: "#16a34a", whiteSpace: "nowrap" }}
                  onClick={handleAddSerialToEntry}
                >
                  <Plus size={16} /> Agregar Serial
                </button>
              </div>

              {entryForm.serialesLista.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#166534", marginBottom: "6px" }}>
                    Seriales listos para ingresar ({entryForm.serialesLista.length}):
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {entryForm.serialesLista.map((ser, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: "white",
                          border: "1px solid #86efac",
                          color: "#166534",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontFamily: "monospace",
                          fontWeight: "700",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        {ser}
                        <button
                          type="button"
                          onClick={() => handleRemoveSerialFromEntry(ser)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#dc2626",
                            cursor: "pointer",
                            fontWeight: "800"
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Observaciones / Número de Factura o Lote (Opcional)</label>
              <input
                type="text"
                className="input-control"
                placeholder="Ej: Factura #FE-4092 - Lote importación octubre"
                value={entryForm.observaciones}
                onChange={(e) => setEntryForm({ ...entryForm, observaciones: e.target.value })}
              />
            </div>

            {/* Resumen de impacto en Stock */}
            {selectedProductForEntry && (
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "22px"
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", color: "#1e40af", fontWeight: "600" }}>
                    Resumen de actualización de inventario:
                  </div>
                  <div style={{ fontSize: "14px", color: "#0f172a", marginTop: "2px" }}>
                    Stock actual: <strong>{selectedProductForEntry.stockActual || 0}</strong> ➔ Nuevo stock tras la entrada:{" "}
                    <strong style={{ color: "#16a34a", fontSize: "16px" }}>
                      {(selectedProductForEntry.stockActual || 0) + (parseInt(entryForm.cantidad) || 0)} unidades
                    </strong>
                  </div>
                </div>
                <CheckCircle2 size={26} color="#2563eb" />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveView("historial")}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ backgroundColor: "#16a34a" }}
                disabled={saving}
              >
                {saving ? "Registrando entrada..." : "Confirmar Entrada y Sumar al Stock"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          VISTA 3: REGISTRAR VENTA (Escáner, Varios Productos y Seriales)
         ===================================================================== */}
      {activeView === "venta" && (
        <div className="card" style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              paddingBottom: "18px",
              marginBottom: "22px",
              borderBottom: "1px solid var(--border)"
            }}
          >
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                backgroundColor: "#ffedd5",
                color: "#ea580c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <ShoppingCart size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                Registrar Venta — Escáner de Código de Barras y Seriales
              </h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                Escanea códigos de barras o selecciona uno o varios productos, indica los seriales vendidos y descuenta automáticamente del inventario.
              </p>
            </div>
          </div>

          {/* Barra de Escáner de Código de Barras + Selector Manual */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: "16px",
              backgroundColor: "#f8fafc",
              padding: "18px",
              borderRadius: "14px",
              border: "1px solid var(--border)",
              marginBottom: "24px"
            }}
          >
            <form onSubmit={handleBarcodeScannerSubmit}>
              <label className="input-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Barcode size={16} color="#ea580c" />
                Escanear Código de Barras del Producto
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Escanea o escribe el código (ej: 770...) y presiona Enter"
                  value={scannerInput}
                  onChange={(e) => setScannerInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: "#ea580c", whiteSpace: "nowrap" }}
                >
                  Escáner +
                </button>
              </div>
            </form>

            <div>
              <label className="input-label">O seleccionar producto del catálogo</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <select
                  className="input-control"
                  value={selectedProdToAdd}
                  onChange={(e) => setSelectedProdToAdd(e.target.value)}
                >
                  <option value="">-- Elegir un producto --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={(p.stockActual || 0) <= 0}>
                      {p.nombre} — ${(p.precioVenta || 0).toLocaleString("es-CO")} (Stock: {p.stockActual || 0})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const found = products.find((p) => p.id === selectedProdToAdd);
                    if (found) {
                      addProductToSaleCart(found);
                      setSelectedProdToAdd("");
                    }
                  }}
                >
                  <Plus size={16} /> Agregar
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleConfirmMultiSale}>
            {/* Datos generales de la venta */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Cliente / Comprador</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Nombre del cliente o NIT/Cédula (Ej: Juan Pérez)"
                  value={clienteVenta}
                  onChange={(e) => setClienteVenta(e.target.value)}
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Fecha de la Venta *</label>
                <input
                  type="date"
                  className="input-control"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Tabla de Productos en el Carrito de Venta */}
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "12px",
                overflow: "hidden",
                marginBottom: "20px"
              }}
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ width: "110px" }}>Cantidad</th>
                    <th style={{ width: "150px" }}>Precio Unit.</th>
                    <th>Seriales / IMEI a entregar</th>
                    <th>Subtotal</th>
                    <th style={{ textAlign: "right" }}>Quitar</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                        El carrito de venta está vacío. Escanea un código de barras o selecciona uno o varios productos arriba.
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item) => {
                      const prod = item.product;
                      const dispSerials = Array.isArray(prod.serialesDisponibles)
                        ? prod.serialesDisponibles
                        : [];

                      return (
                        <tr key={prod.id}>
                          <td>
                            <div style={{ fontWeight: "700", color: "#0f172a" }}>{prod.nombre}</div>
                            <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                              Cód: {prod.codigoBarras} • Stock disp: <strong>{prod.stockActual}</strong>
                            </div>
                          </td>

                          <td>
                            <input
                              type="number"
                              min="1"
                              max={prod.stockActual}
                              className="input-control"
                              style={{ padding: "7px 10px" }}
                              value={item.cantidad}
                              onChange={(e) =>
                                handleUpdateCartItem(prod.id, "cantidad", e.target.value)
                              }
                              required
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              className="input-control"
                              style={{ padding: "7px 10px" }}
                              value={item.precioUnitario}
                              onChange={(e) =>
                                handleUpdateCartItem(prod.id, "precioUnitario", e.target.value)
                              }
                              required
                            />
                          </td>

                          <td>
                            <input
                              type="text"
                              className="input-control"
                              style={{ padding: "7px 10px", fontSize: "12.5px" }}
                              placeholder="Escanear o escribir seriales (sep. por coma)"
                              value={item.serialesTexto}
                              onChange={(e) =>
                                handleUpdateCartItem(prod.id, "serialesTexto", e.target.value)
                              }
                            />
                            {dispSerials.length > 0 && (
                              <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b" }}>
                                Disponibles:{" "}
                                {dispSerials.slice(0, 4).map((s, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      const current = item.serialesTexto
                                        ? item.serialesTexto.split(",").map((x) => x.trim()).filter(Boolean)
                                        : [];
                                      if (!current.includes(s)) {
                                        handleUpdateCartItem(
                                          prod.id,
                                          "serialesTexto",
                                          [...current, s].join(", ")
                                        );
                                      }
                                    }}
                                    style={{
                                      marginRight: "4px",
                                      padding: "1px 6px",
                                      fontSize: "10.5px",
                                      borderRadius: "4px",
                                      border: "1px solid #cbd5e1",
                                      backgroundColor: "#f8fafc",
                                      cursor: "pointer"
                                    }}
                                  >
                                    +{s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          <td>
                            <strong style={{ color: "#0f172a" }}>
                              ${(item.cantidad * (parseFloat(item.precioUnitario) || 0)).toLocaleString("es-CO")}
                            </strong>
                          </td>

                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveCartItem(prod.id)}
                              style={{
                                background: "#fee2e2",
                                border: "none",
                                color: "#dc2626",
                                padding: "6px 10px",
                                borderRadius: "8px",
                                cursor: "pointer"
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Totalizador */}
            <div
              style={{
                backgroundColor: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: "14px",
                padding: "18px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "22px"
              }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#9a3412" }}>
                  Total de la Venta ({cartItems.reduce((a, b) => a + b.cantidad, 0)} unidades)
                </div>
                <div style={{ fontSize: "12px", color: "#c2410c" }}>
                  Al confirmar, el stock disminuirá automáticamente y se registrará la salida en el historial.
                </div>
              </div>
              <div style={{ fontSize: "26px", fontWeight: "800", color: "#ea580c" }}>
                ${totalVentaCarrito.toLocaleString("es-CO")}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveView("historial")}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ backgroundColor: "#ea580c" }}
                disabled={saving || cartItems.length === 0}
              >
                {saving ? "Procesando Venta..." : "Confirmar Venta y Descontar Stock"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
