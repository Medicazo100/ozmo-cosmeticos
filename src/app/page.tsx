"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db, Product, Order, Settings } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { useProductosRealtime } from "@/hooks/useProductosRealtime";
import QRModal from "@/components/QRModal";

function generateOrderId() {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

export default function CatalogPage() {
  // Estados de carga e interfaz
  const [showSplash, setShowSplash] = useState(true);
  const { products, loading } = useProductosRealtime();
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
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  
  // Estados de interacción
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Estado de Carrito (inicializado vacío para evitar errores de hidratación SSR)
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Estado de Checkout
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  
  // Estado de Confirmación
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastOrderId, setLastOrderId] = useState("");

  // Carga inicial y Splash Screen
  useEffect(() => {
    // Limpieza inicial automatizada de pedidos antiguos una única vez
    if (typeof window !== "undefined") {
      const cleared = localStorage.getItem("ozmo_orders_cleared_v1");
      if (!cleared) {
        db.clearOrders();
        localStorage.setItem("ozmo_orders_cleared_v1", "true");
      }
    }

    // Duración de Splash Screen (rápida para abrir directamente la tienda)
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Cargar carrito desde localStorage una vez montado el componente (client-side only)
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("ozmo_cosmeticos_cart") || localStorage.getItem("perfumazo_cart");
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch (e) {
      console.error("Error cargando el carrito", e);
    }
    setCartHydrated(true);
  }, []);

  // Guardar carrito en localStorage cuando cambie (solo después de hidratar)
  useEffect(() => {
    if (!cartHydrated) return;
    localStorage.setItem("ozmo_cosmeticos_cart", JSON.stringify(cart));
  }, [cart, cartHydrated]);

  // Recargar catálogo al enfocar la ventana (solo ajustes)
  useEffect(() => {
    const handleFocus = () => {
      setSettings(db.getSettings());
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Agregar al carrito
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return; // Agotado

    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        // Verificar no exceder stock
        if (existing.quantity >= product.stock) return prevCart;
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });

    // Abrir carrito para feedback visual inmediato (Menos clics, más ventas)
    setIsCartOpen(true);
  };

  // Quitar o disminuir del carrito
  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === productId);
      if (!existing) return prevCart;
      if (existing.quantity === 1) {
        return prevCart.filter(item => item.product.id !== productId);
      }
      return prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  // Remover item completo del carrito
  const removeAllFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  // Total del carrito
  const cartTotal = cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Procesar Checkout y Enviar a WhatsApp
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutName || !checkoutPhone || !checkoutAddress) {
      alert("Por favor completa todos los campos del formulario.");
      return;
    }

    const orderId = generateOrderId();
    
    // Crear el objeto Order
    const newOrder: Order = {
      id: orderId,
      customerName: checkoutName,
      customerPhone: checkoutPhone,
      customerAddress: checkoutAddress,
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        brand: item.product.brand,
        price: item.product.price,
        quantity: item.quantity
      })),
      total: cartTotal,
      status: "Pendiente",
      createdAt: new Date().toISOString()
    };

    // Guardar pedido en DB local
    db.saveOrder(newOrder);

    // Decrementar stock en Supabase por cada item del carrito (tiempo real)
    for (const item of cart) {
      for (let i = 0; i < item.quantity; i++) {
        await supabase.rpc("registrar_venta_presencial", {
          product_id: item.product.id
        });
      }
    }

    // Formatear mensaje de WhatsApp
    let message = `✨ *NUEVO PEDIDO EN ${settings.storeName.toUpperCase()}* ✨\n`;
    message += `------------------------------------------\n`;
    message += `👤 *Cliente:* ${checkoutName}\n`;
    message += `📞 *Teléfono:* ${checkoutPhone}\n`;
    message += `📍 *Dirección:* ${checkoutAddress}\n`;
    message += `🆔 *Pedido ID:* #${orderId}\n`;
    message += `------------------------------------------\n\n`;
    message += `📦 *Productos:* \n`;

    cart.forEach(item => {
      message += `• ${item.quantity}x *${item.product.name}* (${item.product.brand}) - $${(item.product.price * item.quantity).toLocaleString("es-MX")} MXN\n`;
    });

    message += `\n💵 *Total a pagar:* $${cartTotal.toLocaleString("es-MX")} MXN\n`;
    message += `------------------------------------------\n`;
    message += `¡Hola! Acabo de hacer este pedido desde la boutique web. Me gustaría coordinar el pago y la entrega.`;

    // Codificar mensaje para URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${settings.whatsappNumber}?text=${encodedMessage}`;

    // Guardar ID para mostrar confirmación
    setLastOrderId(orderId);
    
    // Limpiar carrito y cerrar modales
    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    
    // Abrir WhatsApp en nueva pestaña
    window.open(whatsappUrl, "_blank");

    // Mostrar pantalla de agradecimiento
    setShowConfirmation(true);
  };

  // Filtrado y Búsqueda de Productos
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === "Todos" || 
      product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Splash Screen Render
  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out">
        <div className="text-center flex flex-col items-center gap-6 animate-pulse">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo.jpg" 
            alt="OZMO Logo" 
            className="w-44 h-44 md:w-60 md:h-60 rounded-full object-cover border border-rose-500/30 shadow-2xl" 
          />
          <div>
            <h1 className="text-4xl md:text-6xl font-serif tracking-widest text-mixed-gradient font-bold mb-1">
              OZMO
            </h1>
            <p className="text-rose-400 tracking-[0.35em] text-xs md:text-sm uppercase font-sans font-bold mt-2">
              Cosméticos y Perfumes
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-rose-500/20 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedCategory("Todos")}>
            <h1 className="text-2xl font-serif tracking-widest text-mixed-gradient font-bold">
              OZMO
            </h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Botón de QR */}
            <button
              onClick={() => setIsQRModalOpen(true)}
              className="p-2 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              aria-label="Compartir tienda"
              title="Compartir tienda"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 0 1-1.125-1.125v-3.75zM3.75 14.25c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 0 1-1.125-1.125v-3.75zM14.25 4.875c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-3.75a1.125 1.125 0 0 1-1.125-1.125v-3.75zM14.25 14.25h1.5v1.5h-1.5zM17.25 14.25h1.5v1.5h-1.5zM14.25 17.25h1.5v1.5h-1.5zM17.25 17.25h1.5v1.5h-1.5zM18.75 15.75h1.5v1.5h-1.5zM18.75 18.75h1.5v1.5h-1.5zM15.75 18.75h1.5v1.5h-1.5zM15.75 15.75h1.5v1.5h-1.5z" />
              </svg>
            </button>

            {/* Botón de Carrito */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              aria-label="Ver carrito"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-400 to-rose-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Enlace oculto al Admin Panel */}
            <Link
              href="/admin"
              className="p-2 text-warm-500 hover:text-rose-400 transition-colors"
              title="Administración"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {/* Vista de Confirmación de Pedido */}
        {showConfirmation ? (
          <section className="max-w-lg mx-auto my-12 px-6 py-12 bg-warm-900/40 border border-rose-500/20 rounded-2xl text-center shadow-2xl animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-rose-500 to-rose-700 rounded-full flex items-center justify-center text-white">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-serif text-fuchsia-gradient font-bold mb-4">¡Pedido Enviado!</h2>
            <p className="text-warm-200 mb-6 leading-relaxed">
              Tu pedido <span className="font-mono text-rose-400 font-bold">#{lastOrderId}</span> se ha generado correctamente.
            </p>
            <div className="bg-black p-4 rounded-xl border border-warm-850 text-left text-sm mb-8 space-y-2">
              <p className="text-warm-400">Hemos abierto una pestaña con WhatsApp para que confirmes tu pedido con la tienda.</p>
              <p className="text-warm-400">Si no se abrió automáticamente, puedes contactar al administrador indicando el ID del pedido.</p>
            </div>
            <button
              onClick={() => setShowConfirmation(false)}
              className="w-full py-4 px-6 bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-450 hover:to-rose-650 text-white font-semibold rounded-xl tracking-wider transition-all duration-300 transform hover:scale-[1.02] cursor-pointer"
            >
              Volver a la Tienda
            </button>
          </section>
        ) : (
          <>
            {/* Hero Section - La fotografía vende */}
            <section className="relative w-full h-[55vh] md:h-[65vh] bg-cover bg-center flex items-end" style={{ backgroundImage: `url('${settings.heroImageUrl || "/hero_banner.png"}')` }}>
              {/* Overlay oscuro */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              
              <div className="relative max-w-7xl mx-auto w-full px-4 md:px-8 pb-12 md:pb-16 text-left">
                <span className="text-rose-450 tracking-[0.3em] text-xs md:text-sm uppercase font-semibold mb-2 block">
                  Boutique Digital Premium
                </span>
                <h2 className="text-4xl md:text-6xl font-serif font-bold text-white max-w-2xl leading-tight mb-4">
                  Elegancia que se siente.
                </h2>
                <p className="text-warm-200 text-sm md:text-lg max-w-xl mb-6 font-light leading-relaxed">
                  Descubre nuestra exclusiva selección de cosméticos y perfumes de alta gama. Adquiere tus productos favoritos con solo dos clics.
                </p>
                <button
                  onClick={() => document.getElementById("catalogo-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="py-3 px-8 bg-rose-500 text-white font-semibold text-sm rounded-full tracking-wider hover:bg-rose-600 transition-all duration-300 shadow-xl cursor-pointer"
                >
                  Explorar Catálogo
                </button>
              </div>
            </section>

            {/* Catálogo Section */}
            <section id="catalogo-section" className="max-w-7xl mx-auto px-4 py-12 md:px-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                  <h3 className="text-3xl font-serif font-bold tracking-wide">Catálogo Premium</h3>
                  <p className="text-rose-300/70 text-sm mt-1">Cosméticos y fragancias premium de las mejores marcas</p>
                </div>
                
                {/* Buscador */}
                <div className="relative w-full md:w-80">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-warm-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar marca o producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-warm-900/50 border border-warm-850 rounded-xl text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder-warm-500 text-white"
                  />
                </div>
              </div>

              {/* Filtros de Categorías */}
              <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 -mx-4 px-4 scrollbar-none">
                {["Todos", "Árabes", "Comerciales", "Niche"].map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-6 py-2.5 rounded-full text-xs md:text-sm font-medium tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      selectedCategory === category
                        ? "bg-rose-500 text-white font-semibold shadow-md"
                        : "bg-warm-900/40 text-warm-300 hover:bg-warm-900/80 border border-warm-800/60"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Grid de Productos */}
              {loading && products.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="bg-warm-900/20 border border-warm-900/40 rounded-2xl h-96 animate-pulse p-6 flex flex-col justify-between">
                      <div className="w-full h-48 bg-warm-850/50 rounded-xl mb-4" />
                      <div className="space-y-3">
                        <div className="h-4 bg-warm-850/50 rounded w-1/3" />
                        <div className="h-6 bg-warm-850/50 rounded w-2/3" />
                        <div className="h-4 bg-warm-850/50 rounded w-full" />
                      </div>
                      <div className="h-10 bg-warm-850/50 rounded-xl mt-4" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-warm-900/10 border border-warm-850 rounded-2xl">
                  <svg className="w-12 h-12 mx-auto text-warm-650 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-warm-400 font-light text-lg">No encontramos productos que coincidan con tu búsqueda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`group bg-warm-900/20 border border-warm-900/40 rounded-2xl overflow-hidden flex flex-col shadow-lg hover:shadow-2xl hover:border-rose-500/30 transition-all duration-500 ${
                        product.stock === 0 ? "opacity-60 grayscale-[30%]" : ""
                      }`}
                    >
                      {/* Imagen de Producto */}
                      <div 
                        className="relative h-72 w-full overflow-hidden bg-warm-950 cursor-pointer"
                        onClick={() => setSelectedProduct(product)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.imageUrl}
                          alt={`${product.brand} - ${product.name}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          loading="lazy"
                        />
                        {/* Overlay sutil */}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
                        
                        {/* Badges de Stock */}
                        {product.stock === 0 ? (
                          <span className="absolute top-4 left-4 bg-black/80 text-red-400 text-[10px] font-bold px-3 py-1.5 rounded-full tracking-wider uppercase border border-red-500/20">
                            🔴 Agotado
                          </span>
                        ) : product.stock === 1 ? (
                          <span className="absolute top-4 left-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full tracking-wider uppercase shadow-md animate-pulse">
                            ¡Última pieza!
                          </span>
                        ) : null}

                        {/* Category Badge */}
                        <span className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-warm-200 text-[9px] font-semibold px-2.5 py-1 rounded-md tracking-wider uppercase">
                          {product.category}
                        </span>
                      </div>

                      {/* Info de Producto */}
                      <div className="p-6 flex-grow flex flex-col justify-between">
                        <div className="cursor-pointer" onClick={() => setSelectedProduct(product)}>
                          <span className="text-rose-400 text-[10px] tracking-[0.2em] font-semibold uppercase block mb-1">
                            {product.brand}
                          </span>
                          <h4 className="text-xl font-serif font-bold text-white group-hover:text-rose-450 transition-colors mb-2">
                            {product.name}
                          </h4>
                          <p className="text-warm-300 text-xs font-light line-clamp-2 mb-4 leading-relaxed">
                            {product.description}
                          </p>
                        </div>

                        <div>
                          {/* Precios */}
                          <div className="flex items-baseline gap-3 mb-2">
                            <span className="text-2xl font-bold text-white font-mono">
                              ${product.price.toLocaleString("es-MX")}
                            </span>
                            {product.originalPrice && (
                              <>
                                <span className="text-sm text-warm-500 line-through font-mono">
                                  ${product.originalPrice.toLocaleString("es-MX")}
                                </span>
                                <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-bold font-mono">
                                  -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                                </span>
                              </>
                            )}
                          </div>

                          {/* Disponibilidad visible para el cliente */}
                          <div className="flex items-center gap-2 mb-4 text-xs font-light">
                            {product.stock === 0 ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                <span className="text-red-400">Agotado temporalmente</span>
                              </>
                            ) : product.stock === 1 ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                <span className="text-rose-450 font-medium">¡Última pieza disponible!</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span className="text-warm-300">{product.stock} piezas disponibles</span>
                              </>
                            )}
                          </div>

                          {/* Botón de compra rápido o WhatsApp según stock */}
                          {product.stock === 0 ? (
                            <button
                              disabled
                              className="w-full py-3 px-4 rounded-xl text-xs md:text-sm font-semibold tracking-wider uppercase bg-warm-900/30 text-warm-500 border border-warm-900/50 cursor-not-allowed"
                            >
                              🔴 Agotado
                            </button>
                          ) : product.stock === 1 ? (
                            <a
                              href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
                                `Hola, estoy interesado en la última pieza de *${product.name}* (${product.brand}).`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-3 px-4 rounded-xl text-xs md:text-sm font-semibold tracking-wider uppercase text-center bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-450 hover:to-rose-650 text-white shadow-lg block transition-all font-bold"
                            >
                              ⚠️ Confirmar disponibilidad por WhatsApp
                            </a>
                          ) : (
                            <button
                              onClick={() => addToCart(product)}
                              className="w-full py-3 px-4 rounded-xl text-xs md:text-sm font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-450 hover:to-rose-650 text-white hover:shadow-lg hover:shadow-rose-500/10"
                            >
                              Añadir al Carrito
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-rose-500/20 py-12 px-4 md:px-8 text-center text-warm-400 text-xs mt-12">
        <div className="max-w-7xl mx-auto space-y-6">
          <p className="font-serif tracking-widest text-rose-500 text-sm font-bold">OZMO COSMÉTICOS Y PERFUMES</p>
          <p className="font-light text-rose-300 italic">&ldquo;Elegancia que se siente&rdquo;</p>
          
          {/* Ubicación y Horarios */}
          <div className="max-w-md mx-auto bg-warm-900/30 border border-rose-500/10 p-4 rounded-xl space-y-2 text-warm-300">
            <p className="font-semibold text-white">📍 Ubicación</p>
            <p>Abraham M. González 174, Colonia Bonifacio Moreno, Apatzingán, Mich.</p>
            <p className="font-semibold text-white mt-3">📅 Horarios de Atención</p>
            <p>Lunes a Viernes: 10:00 AM - 7:00 PM</p>
            <p>Sábado: 11:00 AM - 5:00 PM</p>
            <p className="font-semibold text-white mt-3">📞 Contacto / WhatsApp</p>
            <a 
              href={`https://wa.me/${settings.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-rose-400 font-bold hover:underline block hover:text-rose-300 text-sm"
            >
              {settings.whatsappNumber.length >= 10 
                ? settings.whatsappNumber.replace(/^521?/, "").replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")
                : settings.whatsappNumber}
            </a>
          </div>

          <div className="flex justify-center items-center gap-6 text-warm-500">
            <span className="cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setSelectedCategory("Todos")}>Catálogo</span>
            <span>•</span>
            <a href="https://www.facebook.com/ozmo.cosmeticos.y.perfumes/" target="_blank" rel="noopener noreferrer" className="hover:text-rose-500 transition-colors">
              Facebook
            </a>
            <span>•</span>
            <Link href="/admin" className="hover:text-rose-500 transition-colors">Administración</Link>
          </div>
          <p className="text-warm-650 text-[10px] mt-6">&copy; 2026 OZMO Cosméticos y Perfumes. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* MODAL: DETALLE DEL PRODUCTO (Sephora/Notion style) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl bg-warm-900/90 border border-warm-850 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:max-h-[80vh]">
            {/* Botón de Cerrar */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:text-rose-400 transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Imagen del Producto en Modal */}
            <div className="w-full md:w-1/2 h-48 sm:h-64 md:h-auto min-h-[200px] md:min-h-[350px] relative bg-warm-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-warm-950 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-warm-950/20" />
            </div>

            {/* Detalles del Producto */}
            <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col justify-between overflow-y-auto">
              <div>
                <span className="text-rose-400 text-xs tracking-[0.25em] font-semibold uppercase block mb-1">
                  {selectedProduct.brand}
                </span>
                <h3 className="text-3xl font-serif font-bold text-white mb-2">
                  {selectedProduct.name}
                </h3>
                
                {/* Badges y Categoría */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-warm-800 text-warm-200 text-[10px] font-semibold px-2.5 py-1 rounded-md tracking-wider uppercase">
                    {selectedProduct.category}
                  </span>
                  
                  {selectedProduct.stock === 0 ? (
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-md tracking-wider uppercase">
                      Agotado
                    </span>
                  ) : selectedProduct.stock === 1 ? (
                    <span className="bg-rose-500/10 text-rose-450 border border-rose-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-md tracking-wider uppercase animate-pulse">
                      Última pieza
                    </span>
                  ) : (
                    <span className="text-warm-400 text-[11px]">Disponible: {selectedProduct.stock} pzas</span>
                  )}
                </div>

                <p className="text-warm-200 text-sm font-light leading-relaxed mb-6">
                  {selectedProduct.description}
                </p>

                {/* Pirámide Olfativa (Sephora/Notion Style) */}
                <div className="bg-warm-950/60 border border-warm-850 rounded-2xl p-5 mb-6 space-y-4">
                  <h5 className="text-xs font-semibold tracking-widest text-rose-400 uppercase mb-2">Composición Aromática</h5>
                  
                  <div className="space-y-3 text-xs md:text-sm">
                    <div className="flex gap-3">
                      <span className="text-lg leading-none" title="Notas de Salida">🌬️</span>
                      <div>
                        <span className="font-semibold text-warm-300 block">Notas de Salida (Primer impacto):</span>
                        <span className="text-warm-400 font-light">{selectedProduct.notes.top}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <span className="text-lg leading-none" title="Notas de Corazón">💖</span>
                      <div>
                        <span className="font-semibold text-warm-300 block">Notas de Corazón (Cuerpo del perfume):</span>
                        <span className="text-warm-400 font-light">{selectedProduct.notes.heart}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <span className="text-lg leading-none" title="Notas de Fondo">🌲</span>
                      <div>
                        <span className="font-semibold text-warm-300 block">Notas de Fondo (Fijación y permanencia):</span>
                        <span className="text-warm-400 font-light">{selectedProduct.notes.base}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Precio y Compra */}
              <div className="border-t border-warm-800 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-warm-400 uppercase tracking-widest">Precio</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white font-mono">
                      ${selectedProduct.price.toLocaleString("es-MX")}
                    </span>
                    {selectedProduct.originalPrice && (
                      <span className="text-sm text-warm-500 line-through font-mono">
                        ${selectedProduct.originalPrice.toLocaleString("es-MX")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  {selectedProduct.stock === 0 ? (
                    <button
                      disabled
                      className="flex-grow py-4 rounded-xl font-semibold tracking-wider uppercase text-sm bg-warm-800 text-warm-500 border border-warm-900 cursor-not-allowed"
                    >
                      🔴 Agotado
                    </button>
                  ) : selectedProduct.stock === 1 ? (
                    <a
                      href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
                        `Hola, estoy interesado en la última pieza de *${selectedProduct.name}* (${selectedProduct.brand}).`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-grow py-4 rounded-xl font-semibold tracking-wider uppercase text-center text-sm bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-450 hover:to-rose-650 text-white transition-all block font-bold"
                    >
                      ⚠️ Confirmar disponibilidad por WhatsApp
                    </a>
                  ) : (
                    <button
                      onClick={() => {
                        addToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      className="flex-grow py-4 rounded-xl font-semibold tracking-wider uppercase transition-all duration-300 text-sm cursor-pointer bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-450 hover:to-rose-650 text-white"
                    >
                      Añadir al Carrito
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: CARRITO DE COMPRAS */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          {/* Fondo para cerrar */}
          <div className="absolute inset-0 -z-10" onClick={() => setIsCartOpen(false)} />
          
          <div className="w-full max-w-md bg-warm-950 border-l border-warm-850 h-full flex flex-col shadow-2xl animate-slide-in">
            {/* Cabecera del Carrito */}
            <div className="p-6 border-b border-warm-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <h3 className="text-xl font-serif font-bold text-white">Mi Carrito</h3>
                <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-full text-warm-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Cerrar carrito"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Listado de items */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-warm-500">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-40 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <p className="text-sm font-light">El carrito está vacío.</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 text-xs font-semibold text-rose-450 tracking-wider uppercase hover:underline cursor-pointer"
                  >
                    Ver catálogo
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-4 p-3 bg-warm-900/30 border border-warm-850 rounded-xl items-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-lg bg-warm-950"
                    />
                    <div className="flex-grow min-w-0">
                      <span className="text-rose-450 text-[9px] tracking-wider font-semibold uppercase block">
                        {item.product.brand}
                      </span>
                      <h5 className="text-sm font-bold text-white truncate">{item.product.name}</h5>
                      <span className="text-xs text-warm-300 font-mono">
                        ${item.product.price.toLocaleString("es-MX")} MXN
                      </span>
                    </div>

                    <div className="flex flex-col items-end justify-between h-full gap-2">
                      {/* Eliminar completamente */}
                      <button 
                        onClick={() => removeAllFromCart(item.product.id)}
                        className="text-warm-500 hover:text-red-400 p-0.5 cursor-pointer"
                        title="Eliminar del carrito"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      {/* Control de Cantidad */}
                      <div className="flex items-center gap-2 bg-warm-950 border border-warm-800 rounded-lg p-1">
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-5 h-5 flex items-center justify-center text-warm-400 hover:text-white cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item.product)}
                          disabled={item.quantity >= item.product.stock}
                          className={`w-5 h-5 flex items-center justify-center ${
                            item.quantity >= item.product.stock 
                              ? "text-warm-700 cursor-not-allowed" 
                              : "text-warm-400 hover:text-white cursor-pointer"
                          }`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Sección de pago inferior */}
            {cart.length > 0 && (
              <div className="p-6 border-t border-warm-850 bg-warm-950/80 space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-warm-400 uppercase tracking-widest">Total estimado:</span>
                  <span className="text-2xl font-bold font-mono text-fuchsia-gradient">
                    ${cartTotal.toLocaleString("es-MX")} MXN
                  </span>
                </div>

                {/* Comprar ahora -> Abre checkout (Menos clics, más ventas) */}
                <button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-450 hover:to-rose-650 text-white font-semibold rounded-xl text-center tracking-wider transition-all duration-300 transform hover:scale-[1.01] cursor-pointer"
                >
                  Proceder al Pago
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CHECKOUT (Captura de datos) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-md bg-warm-950 border border-warm-800 rounded-3xl p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-warm-900 text-warm-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-serif text-fuchsia-gradient font-bold mb-2">Finalizar Pedido</h3>
            <p className="text-xs text-warm-400 mb-6 leading-relaxed">
              Completa los datos de envío. Tu pedido será enviado a WhatsApp para coordinar el pago y la entrega directamente con nosotros.
            </p>

            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={checkoutName}
                  onChange={(e) => setCheckoutName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-4 py-3 bg-warm-900/60 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white placeholder-warm-600"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-1">Tu Teléfono (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  value={checkoutPhone}
                  onChange={(e) => setCheckoutPhone(e.target.value)}
                  placeholder="Ej. 4531236853"
                  className="w-full px-4 py-3 bg-warm-900/60 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white placeholder-warm-600"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-warm-400 font-semibold mb-1">Dirección de Entrega</label>
                <textarea
                  required
                  rows={3}
                  value={checkoutAddress}
                  onChange={(e) => setCheckoutAddress(e.target.value)}
                  placeholder="Calle, Número, Colonia, Ciudad, Código Postal..."
                  className="w-full px-4 py-3 bg-warm-900/60 border border-warm-800 rounded-xl text-sm focus:outline-none focus:border-rose-500 text-white placeholder-warm-600 resize-none"
                />
              </div>

              {/* Resumen del Total */}
              <div className="bg-warm-900/30 border border-warm-900/50 p-4 rounded-2xl flex justify-between items-baseline mt-6 mb-2">
                <span className="text-xs uppercase tracking-wider text-warm-400">Total a pagar:</span>
                <span className="text-xl font-bold font-mono text-rose-400">
                  ${cartTotal.toLocaleString("es-MX")} MXN
                </span>
              </div>

              {/* Botón WhatsApp */}
              <button
                type="submit"
                className="w-full py-4 mt-2 bg-[#25D366] hover:bg-[#20ba5a] text-black font-bold rounded-xl flex items-center justify-center gap-2.5 tracking-wider transition-all duration-300 transform hover:scale-[1.01] cursor-pointer"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Confirmar y Abrir WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QRModal 
        isOpen={isQRModalOpen} 
        onClose={() => setIsQRModalOpen(false)} 
        url="https://ozmo-cosmeticos.vercel.app/" 
      />
    </div>
  );
}
