/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db, Product, Order, Settings } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { useProductosRealtime } from "@/hooks/useProductosRealtime";

export default function AdminPage() {
  // Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Datos Supabase Realtime
  const { products } = useProductosRealtime();
  const [orders, setOrders] = useState<Order[]>([]);

  // Limpieza inicial automatizada de pedidos antiguos una única vez
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cleared = localStorage.getItem("ozmo_orders_cleared_v1");
      if (!cleared) {
        db.clearOrders();
        localStorage.setItem("ozmo_orders_cleared_v1", "true");
      }
    }
  }, []);
  const [settings, setSettings] = useState<Settings>({
    whatsappNumber: "524535303820",
    storeName: "OZMO Cosméticos y Perfumes",
    heroImageUrl: "/hero_banner.png"
  });

  useEffect(() => {
    const loaded = db.getSettings();
    Promise.resolve().then(() => {
      setSettings(loaded);
    });
  }, []);

  // Pestaña Activa
  const [activeTab, setActiveTab] = useState<"pedidos" | "productos" | "ajustes">("pedidos");

  // Estado CRUD de Productos
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Formulario de Producto (Agregar/Editar)
  const [prodName, setProdName] = useState("");
  const [prodBrand, setProdBrand] = useState("");
  const [prodPrice, setProdPrice] = useState(0);
  const [prodOriginalPrice, setProdOriginalPrice] = useState<number | undefined>(undefined);
  const [prodStock, setProdStock] = useState(0);
  const [prodCategory, setProdCategory] = useState<'Árabes' | 'Comerciales' | 'Niche'>("Comerciales");
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [prodDescription, setProdDescription] = useState("");
  const [prodTopNotes, setProdTopNotes] = useState("");
  const [prodHeartNotes, setProdHeartNotes] = useState("");
  const [prodBaseNotes, setProdBaseNotes] = useState("");

  // Manejo de Inicio de Sesión
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = settings.adminPassword || "admin";
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      setOrders(db.getOrders());
      setAuthError("");
    } else {
      setAuthError("Contraseña incorrecta. Inténtalo de nuevo.");
    }
  };

  // Guardar Ajustes de Tienda
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    // Si el campo de contraseña queda vacío, conservar la contraseña actual
    const finalSettings = { ...settings };
    if (!finalSettings.adminPassword || finalSettings.adminPassword.trim() === "") {
      const currentSettings = db.getSettings();
      finalSettings.adminPassword = currentSettings.adminPassword || "admin";
    }
    db.saveSettings(finalSettings);
    setSettings(finalSettings);
    alert("Configuración guardada correctamente.");
  };

  // Subir imagen de portada desde el dispositivo
  const handleHeroImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSettings(prev => ({ ...prev, heroImageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Cargar producto en formulario para edición
  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdBrand(product.brand);
    setProdPrice(product.price);
    setProdOriginalPrice(product.originalPrice);
    setProdStock(product.stock);
    setProdCategory(product.category);
    setProdImageUrl(product.imageUrl);
    setProdDescription(product.description);
    setProdTopNotes(product.notes.top);
    setProdHeartNotes(product.notes.heart);
    setProdBaseNotes(product.notes.base);
    setShowAddForm(true);
  };

  // Resetear Formulario de Producto
  const resetProductForm = () => {
    setEditingProduct(null);
    setProdName("");
    setProdBrand("");
    setProdPrice(0);
    setProdOriginalPrice(undefined);
    setProdStock(0);
    setProdCategory("Comerciales");
    setProdImageUrl("");
    setProdDescription("");
    setProdTopNotes("");
    setProdHeartNotes("");
    setProdBaseNotes("");
    setShowAddForm(false);
  };

  // Guardar o Actualizar Producto en Supabase
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodBrand || prodPrice <= 0 || prodStock < 0 || !prodImageUrl || !prodDescription) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    const dbProd = {
      nombre: prodName,
      marca: prodBrand,
      precio: Number(prodPrice),
      precio_original: prodOriginalPrice ? Number(prodOriginalPrice) : null,
      stock: Number(prodStock),
      imagen_url: prodImageUrl,
      descripcion: prodDescription,
      categoria: prodCategory,
      notas_salida: prodTopNotes,
      notas_corazon: prodHeartNotes,
      notas_fondo: prodBaseNotes
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('productos')
          .update(dbProd)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('productos')
          .insert([dbProd]);
        if (error) throw error;
      }
      resetProductForm();
      alert(editingProduct ? "Producto actualizado exitosamente." : "Producto agregado exitosamente.");
    } catch (error: any) {
      console.error("Error saving product in Supabase:", error);
      alert("Error al guardar el producto: " + error.message);
    }
  };

  // Eliminar Producto en Supabase
  const handleDeleteProduct = async (productId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este producto del inventario?")) {
      try {
        const { error } = await supabase
          .from('productos')
          .delete()
          .eq('id', productId);
        if (error) throw error;
        alert("Producto eliminado exitosamente.");
      } catch (error: any) {
        console.error("Error deleting product from Supabase:", error);
        alert("Error al eliminar el producto: " + error.message);
      }
    }
  };

  // Registrar venta presencial en Supabase de forma atómica (RPC)
  const handleVentaPresencial = async (productId: string) => {
    try {
      const { error } = await supabase.rpc("registrar_venta_presencial", {
        product_id: productId
      });
      if (error) throw error;
      alert("Venta presencial registrada correctamente. Stock decrementado en 1.");
    } catch (error: any) {
      console.error("Error registering presencial sale in Supabase:", error);
      alert("Error al registrar venta presencial: " + error.message);
    }
  };

  // Cambiar Estado del Pedido (solo actualiza el estado local del pedido)
  const handleStatusChange = (orderId: string, newStatus: 'Pendiente' | 'Confirmado' | 'Cancelado') => {
    db.updateOrderStatus(orderId, newStatus);
    setOrders(db.getOrders());
  };

  // Estadísticas del Dashboard
  const confirmedSales = orders
    .filter(o => o.status === "Confirmado")
    .reduce((sum, o) => sum + o.total, 0);

  const pendingSales = orders
    .filter(o => o.status === "Pendiente")
    .reduce((sum, o) => sum + o.total, 0);

  const lowStockCount = products.filter(p => p.stock <= 1).length;

  // Render Pantalla de Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 font-sans">
        <div className="max-w-md w-full bg-warm-900/30 border border-warm-850 p-8 rounded-3xl shadow-2xl text-center">
          <h2 className="text-3xl font-serif text-fuchsia-gradient font-bold mb-2">Panel de Control</h2>
          <p className="text-xs text-rose-450 mb-8 uppercase tracking-widest font-semibold">{settings.storeName || "OZMO Cosméticos y Perfumes"}</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-left">
              <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">
                Contraseña de Administrador
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Ingresa la contraseña"
                className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl focus:outline-none focus:border-rose-500 text-center font-mono text-white tracking-widest"
                autoFocus
              />
              {authError && <p className="text-red-400 text-xs mt-2 text-center">{authError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-450 hover:to-rose-650 text-white font-semibold rounded-xl tracking-wider transition-all duration-300 transform hover:scale-[1.01] cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-warm-900/50">
            <Link href="/" className="text-xs text-warm-400 hover:text-rose-400 transition-colors uppercase tracking-wider font-semibold">
              &larr; Volver al Catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar de Navegación */}
      <aside className="w-full md:w-64 bg-warm-950 border-b md:border-b-0 md:border-r border-warm-900 flex flex-col justify-between py-6 px-4 shrink-0">
        <div>
          <div className="px-2 mb-8 text-center md:text-left">
            <h1 className="text-2xl font-serif text-mixed-gradient font-bold tracking-widest">
              OZMO
            </h1>
            <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-widest block">ADMIN PANEL</span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab("pedidos"); resetProductForm(); }}
              className={`w-full text-left py-3 px-4 rounded-xl text-xs uppercase tracking-widest font-semibold flex items-center gap-3 transition-colors cursor-pointer ${
                activeTab === "pedidos"
                  ? "bg-rose-500 text-white"
                  : "text-warm-300 hover:bg-warm-900/50 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Pedidos ({orders.length})
            </button>

            <button
              onClick={() => { setActiveTab("productos"); }}
              className={`w-full text-left py-3 px-4 rounded-xl text-xs uppercase tracking-widest font-semibold flex items-center gap-3 transition-colors cursor-pointer ${
                activeTab === "productos"
                  ? "bg-rose-500 text-white"
                  : "text-warm-300 hover:bg-warm-900/50 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 11m8 4V5" />
              </svg>
              Inventario ({products.length})
            </button>

            <button
              onClick={() => { setActiveTab("ajustes"); resetProductForm(); }}
              className={`w-full text-left py-3 px-4 rounded-xl text-xs uppercase tracking-widest font-semibold flex items-center gap-3 transition-colors cursor-pointer ${
                activeTab === "ajustes"
                  ? "bg-rose-500 text-white"
                  : "text-warm-300 hover:bg-warm-900/50 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ajustes Tienda
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-warm-900 mt-6 md:mt-0 flex flex-col gap-2">
          <Link
            href="/"
            className="w-full text-center py-2 px-4 rounded-xl border border-warm-800 text-warm-300 hover:text-white hover:border-rose-500/30 text-xs font-semibold uppercase tracking-wider transition-all"
          >
            Ir a Tienda
          </Link>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="w-full text-center py-2 px-4 rounded-xl bg-red-950/20 hover:bg-red-900/20 text-red-400 hover:text-red-350 border border-red-950/50 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <main className="flex-grow p-6 md:p-10 max-h-screen overflow-y-auto">
        
        {/* Banner de estadísticas */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-warm-900/20 border border-warm-900 rounded-2xl p-6 shadow-md">
            <span className="text-warm-400 text-[10px] uppercase tracking-wider block mb-1">Ventas Confirmadas</span>
            <span className="text-2xl font-bold font-mono text-fuchsia-gradient">${confirmedSales.toLocaleString("es-MX")} MXN</span>
          </div>
          <div className="bg-warm-900/20 border border-warm-900 rounded-2xl p-6 shadow-md">
            <span className="text-warm-400 text-[10px] uppercase tracking-wider block mb-1">Por Confirmar (Pendientes)</span>
            <span className="text-2xl font-bold font-mono text-warm-300">${pendingSales.toLocaleString("es-MX")} MXN</span>
          </div>
          <div className={`border rounded-2xl p-6 shadow-md transition-colors ${
            lowStockCount > 0 ? "bg-amber-950/15 border-amber-900/40" : "bg-warm-900/20 border-warm-900"
          }`}>
            <span className="text-warm-400 text-[10px] uppercase tracking-wider block mb-1">Alertas de Inventario (0 o 1 pza)</span>
            <span className={`text-2xl font-bold font-mono ${lowStockCount > 0 ? "text-amber-400 animate-pulse" : "text-green-400"}`}>
              {lowStockCount} {lowStockCount === 1 ? "producto" : "productos"}
            </span>
          </div>
        </section>

        {/* CONTENIDO DE PESTAÑA: PEDIDOS */}
        {activeTab === "pedidos" && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-warm-900 pb-4 gap-4">
              <h2 className="text-2xl font-serif font-bold">Gestión de Pedidos</h2>
              <div className="flex items-center gap-3">
                {orders.length > 0 && (
                  <button
                    onClick={() => {
                      const confirmPass = prompt("Por favor, ingresa la contraseña de administrador para confirmar la eliminación de todo el historial:");
                      if (confirmPass === null) return;
                      const correctPassword = settings.adminPassword || "admin";
                      if (confirmPass === correctPassword) {
                        db.clearOrders();
                        setOrders([]);
                        alert("Historial de pedidos eliminado exitosamente.");
                      } else {
                        alert("Contraseña incorrecta. No se eliminó el historial.");
                      }
                    }}
                    className="py-1.5 px-3 bg-red-950/40 border border-red-900/50 hover:bg-red-900/20 text-red-400 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Vaciar Historial
                  </button>
                )}
                <span className="text-xs text-warm-400 bg-warm-900 border border-warm-850 px-3 py-1 rounded-full font-light">
                  {orders.length} pedidos totales
                </span>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-20 bg-warm-900/10 border border-warm-900/30 rounded-2xl">
                <p className="text-warm-500 font-light">Aún no se han registrado pedidos en la base de datos.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...orders].reverse().map((order) => (
                  <div
                    key={order.id}
                    className={`border rounded-2xl p-6 shadow-lg transition-all ${
                      order.status === "Confirmado"
                        ? "bg-warm-900/10 border-green-900/30"
                        : order.status === "Cancelado"
                        ? "bg-warm-900/5 border-red-950/30 opacity-70"
                        : "bg-warm-900/30 border-warm-850"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-warm-900/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg text-white">Pedido #{order.id}</h4>
                          <span className="text-xs font-light text-warm-500">
                            {new Date(order.createdAt).toLocaleString("es-MX")}
                          </span>
                        </div>
                        <p className="text-xs text-warm-400 font-light mt-1">
                          Cliente: <span className="font-semibold text-warm-200">{order.customerName}</span> | Tel: <span className="text-warm-200 font-mono">{order.customerPhone}</span>
                        </p>
                        <p className="text-xs text-warm-400 font-light">
                          Entrega en: <span className="text-warm-200">{order.customerAddress}</span>
                        </p>
                      </div>

                      {/* Control de Estado */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs uppercase tracking-wider text-warm-400">Estado:</span>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans uppercase focus:outline-none border border-transparent cursor-pointer ${
                            order.status === "Confirmado"
                              ? "bg-green-950/80 text-green-300 border-green-700/35"
                              : order.status === "Cancelado"
                              ? "bg-red-950/80 text-red-300 border-red-900/35"
                              : "bg-amber-950/80 text-amber-300 border-amber-800/35"
                          }`}
                        >
                          <option value="Pendiente" className="bg-[#0c0c0c]">Pendiente</option>
                          <option value="Confirmado" className="bg-[#0c0c0c]">Confirmado (Resta Stock)</option>
                          <option value="Cancelado" className="bg-[#0c0c0c]">Cancelado (Devuelve Stock)</option>
                        </select>
                      </div>
                    </div>

                    {/* Detalle de Productos en Pedido */}
                    <div className="space-y-2 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm font-light">
                          <span className="text-warm-300">
                            {item.quantity}x <span className="font-bold text-white">{item.name}</span> ({item.brand})
                          </span>
                          <span className="font-mono text-warm-400">
                            ${(item.price * item.quantity).toLocaleString("es-MX")} MXN
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total y Notas de Regla */}
                    <div className="flex flex-col sm:flex-row justify-between items-baseline gap-2 pt-2 border-t border-warm-900/30">
                      <span className="text-[10px] text-warm-500 font-light italic">
                        *Nota: Descontar stock solo al confirmar venta.
                      </span>
                      <div className="text-right">
                        <span className="text-xs text-warm-400 uppercase tracking-widest mr-2">Total del pedido:</span>
                        <span className="text-xl font-bold font-mono text-fuchsia-gradient">${order.total.toLocaleString("es-MX")} MXN</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* CONTENIDO DE PESTAÑA: PRODUCTOS (INVENTARIO CRUD) */}
        {activeTab === "productos" && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-warm-900 pb-4 gap-4">
              <h2 className="text-2xl font-serif font-bold">Inventario de Productos</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (confirm("¿Estás seguro de que deseas restablecer todo el inventario local a los 8 perfumes predeterminados de fábrica?")) {
                      db.resetProductsToSeed();
                      alert("Inventario restablecido. La página se recargará.");
                      window.location.reload();
                    }
                  }}
                  className="py-2 px-4 bg-warm-950 border border-warm-850 hover:border-rose-500/30 text-warm-300 hover:text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Restaurar Valores Semilla
                </button>
                <button
                  onClick={() => {
                    if (showAddForm) resetProductForm();
                    else setShowAddForm(true);
                  }}
                  className="py-2 px-4 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  {showAddForm ? "Cancelar" : "Agregar Producto"}
                </button>
              </div>
            </div>

            {/* FORMULARIO AGREGAR / EDITAR PRODUCTO */}
            {showAddForm && (
              <form onSubmit={handleSaveProduct} className="bg-warm-900/30 border border-warm-850 p-6 md:p-8 rounded-2xl space-y-6">
                <h3 className="text-lg font-serif font-bold text-fuchsia-gradient mb-4">
                  {editingProduct ? "Editar Producto" : "Agregar Nuevo Producto"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">Nombre del Producto *</label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Ej. Sauvage Parfum o Labial Premium"
                      className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">Marca / Diseñador *</label>
                    <input
                      type="text"
                      required
                      value={prodBrand}
                      onChange={(e) => setProdBrand(e.target.value)}
                      placeholder="Ej. Dior"
                      className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">Precio de Venta ($ MXN) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(Number(e.target.value))}
                      placeholder="Ej. 2950"
                      className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">Precio Original (Opcional, para descuento)</label>
                    <input
                      type="number"
                      min="1"
                      value={prodOriginalPrice || ""}
                      onChange={(e) => setProdOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Ej. 3500"
                      className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">Stock en Inventario *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={prodStock}
                      onChange={(e) => setProdStock(Number(e.target.value))}
                      placeholder="Ej. 10"
                      className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">Categoría *</label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value as any)}
                      className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white cursor-pointer"
                    >
                      <option value="Árabes">Árabes</option>
                      <option value="Comerciales">Comerciales</option>
                      <option value="Niche">Niche</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">URL de Imagen del Producto *</label>
                    <input
                      type="url"
                      required
                      value={prodImageUrl}
                      onChange={(e) => setProdImageUrl(e.target.value)}
                      placeholder="Ej. https://images.unsplash.com/... (URL de la foto)"
                      className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">Descripción Corta *</label>
                    <textarea
                      required
                      rows={3}
                      value={prodDescription}
                      onChange={(e) => setProdDescription(e.target.value)}
                      placeholder="Detalla una descripción elegante..."
                      className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white resize-none"
                    />
                  </div>
                </div>

                {/* Composición de Notas */}
                <div className="bg-warm-950 border border-warm-850 p-5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-semibold tracking-widest text-rose-450 uppercase mb-2">Pirámide Olfativa (Fragancias) / Detalles adicionales</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-warm-400 font-semibold mb-1">🌬️ Notas de Salida</label>
                      <input
                        type="text"
                        value={prodTopNotes}
                        onChange={(e) => setProdTopNotes(e.target.value)}
                        placeholder="Ej. Bergamota, Mandarina"
                        className="w-full px-3 py-2 bg-warm-900 border border-warm-800 rounded-lg text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-warm-400 font-semibold mb-1">💖 Notas de Corazón</label>
                      <input
                        type="text"
                        value={prodHeartNotes}
                        onChange={(e) => setProdHeartNotes(e.target.value)}
                        placeholder="Ej. Sándalo, Jazmín"
                        className="w-full px-3 py-2 bg-warm-900 border border-warm-800 rounded-lg text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-warm-400 font-semibold mb-1">🌲 Notas de Fondo</label>
                      <input
                        type="text"
                        value={prodBaseNotes}
                        onChange={(e) => setProdBaseNotes(e.target.value)}
                        placeholder="Ej. Vainilla, Haba Tonka"
                        className="w-full px-3 py-2 bg-warm-900 border border-warm-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-grow py-3 px-6 bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-450 hover:to-rose-650 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer"
                  >
                    {editingProduct ? "Actualizar Producto" : "Guardar Producto"}
                  </button>
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="py-3 px-6 bg-warm-955 border border-warm-800 hover:bg-warm-900 rounded-xl text-xs uppercase tracking-wider text-warm-300 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* LISTADO DE PRODUCTOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-warm-900/20 border border-warm-900 rounded-2xl p-6 flex gap-4 items-center relative"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded-xl bg-warm-950 shrink-0"
                  />
                  <div className="flex-grow min-w-0 pr-12">
                    <span className="text-rose-450 text-[9px] tracking-wider font-semibold uppercase block">
                      {product.brand}
                    </span>
                    <h4 className="font-serif font-bold text-white text-lg truncate mb-1">{product.name}</h4>
                    <p className="text-xs text-warm-300 font-mono">
                      ${product.price.toLocaleString("es-MX")} MXN
                    </p>
                    
                    {/* Indicadores de stock con reglas base */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-warm-450 uppercase">Stock:</span>
                        {product.stock === 0 ? (
                          <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                            Agotado
                          </span>
                        ) : product.stock === 1 ? (
                          <span className="bg-rose-500/10 text-rose-450 border border-rose-500/20 text-[9px] font-bold px-2 py-0.5 rounded uppercase animate-pulse">
                            ¡Última pieza!
                          </span>
                        ) : (
                          <span className="text-xs font-mono font-bold text-white">{product.stock} unidades</span>
                        )}
                      </div>
                      
                      {/* Botón Registrar Venta Presencial */}
                      {product.stock > 0 && (
                        <button
                          onClick={() => handleVentaPresencial(product.id)}
                          className="text-[9px] uppercase font-bold text-rose-450 hover:text-rose-350 transition-colors bg-rose-500/10 hover:bg-rose-500/20 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer"
                          title="Registrar venta presencial (-1 stock)"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Venta Presencial
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="absolute right-6 flex flex-col gap-2">
                    <button
                      onClick={() => startEditProduct(product)}
                      className="p-2 bg-warm-950 border border-warm-850 hover:border-rose-500/30 rounded-lg text-warm-300 hover:text-white cursor-pointer"
                      title="Editar producto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 bg-red-950/20 border border-red-950/40 hover:border-red-500/35 rounded-lg text-red-400 hover:text-red-300 cursor-pointer"
                      title="Eliminar producto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CONTENIDO DE PESTAÑA: AJUSTES */}
        {activeTab === "ajustes" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-warm-900 pb-4">
              <h2 className="text-2xl font-serif font-bold">Configuración de la Tienda</h2>
            </div>

            <form onSubmit={handleSaveSettings} className="max-w-xl bg-warm-900/30 border border-warm-850 p-6 md:p-8 rounded-2xl space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">
                  Nombre de la Boutique
                </label>
                <input
                  type="text"
                  required
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  placeholder="Ej. OZMO Cosméticos y Perfumes"
                  className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">
                  Número de WhatsApp para Pedidos (Código país + número sin espacios ni signos)
                </label>
                <input
                  type="text"
                  required
                  value={settings.whatsappNumber}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  placeholder="Ej. 524531236853"
                  className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white font-mono"
                />
                <span className="text-[10px] text-warm-500 mt-1 block">
                  Asegúrate de incluir el código internacional (Ej. `52` o `521` para México) sin caracteres especiales.
                </span>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">
                  Nueva Contraseña de Administrador (Opcional)
                </label>
                <input
                  type="password"
                  value={settings.adminPassword || ""}
                  onChange={(e) => setSettings({ ...settings, adminPassword: e.target.value })}
                  placeholder="Dejar vacío para conservar la contraseña actual"
                  className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white font-mono"
                />
                <span className="text-[10px] text-warm-500 mt-1 block">
                  Si dejas este campo vacío, la contraseña actual no cambiará.
                </span>
              </div>

              {/* Ajustes de Página / Imagen de Portada */}
              <div className="border-t border-warm-900 pt-6">
                <h4 className="text-xs font-semibold tracking-widest text-rose-450 uppercase mb-4">Ajustes de Página</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">
                      Imagen de Portada Principal (Hero)
                    </label>
                    <input
                      type="url"
                      value={settings.heroImageUrl || ""}
                      onChange={(e) => setSettings({ ...settings, heroImageUrl: e.target.value })}
                      placeholder="Ej. /hero_banner.png"
                      className="w-full px-4 py-3 bg-warm-950 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white"
                    />
                    <span className="text-[10px] text-warm-500 mt-1 block">
                      Pega un enlace directo de imagen o súbela desde tu dispositivo abajo.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-2">
                      O subir desde tu dispositivo
                    </label>
                    <div className="flex items-center gap-3">
                      <label 
                        htmlFor="hero-upload"
                        className="py-2.5 px-4 bg-warm-950 border border-warm-850 hover:border-rose-500/30 hover:text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer inline-block"
                      >
                        Seleccionar Archivo
                      </label>
                      <input
                        type="file"
                        id="hero-upload"
                        accept="image/*"
                        onChange={handleHeroImageUpload}
                        className="hidden"
                      />
                      <span className="text-xs text-warm-450 truncate max-w-[200px]">
                        {settings.heroImageUrl?.startsWith('data:image') ? "Imagen cargada localmente" : "Ningún archivo seleccionado"}
                      </span>
                    </div>
                  </div>

                  {/* Vista Previa de Imagen */}
                  {settings.heroImageUrl && (
                    <div className="mt-4">
                      <span className="block text-[10px] uppercase tracking-widest text-warm-500 mb-2">Vista Previa de Portada</span>
                      <div className="h-32 w-full rounded-xl overflow-hidden bg-warm-950 border border-warm-850 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={settings.heroImageUrl} 
                          alt="Vista previa de portada" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-rose-500 hover:bg-rose-650 text-white font-semibold rounded-xl text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer"
              >
                Guardar Cambios
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
