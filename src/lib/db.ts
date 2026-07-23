import { supabase } from './supabaseClient';

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  stock: number;
  imageUrl: string;
  description: string;
  notes: {
    top: string;    // Notas de salida
    heart: string;  // Notas de corazón
    base: string;   // Notas de fondo
  };
  category: 'Árabes' | 'Comerciales' | 'Niche';
  featured?: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  total: number;
  status: 'Pendiente' | 'Confirmado' | 'Cancelado';
  createdAt: string;
}

export interface Settings {
  whatsappNumber: string;
  storeName: string;
  adminPassword?: string;
  heroImageUrl?: string;
}

const DEFAULT_SETTINGS: Settings = {
  whatsappNumber: "524535303820", // Número de WhatsApp de OZMO por defecto
  storeName: "OZMO Cosméticos y Perfumes",
  adminPassword: "admin", // Contraseña por defecto para desarrollo
  heroImageUrl: "/hero_banner.png", // Imagen de portada principal autogenerada
};

export const SETTINGS_STORAGE_KEY = 'ozmo_cosmeticos_settings';
export const SETTINGS_UPDATED_EVENT = 'ozmo-settings-updated';

function cloneDefaultSettings(): Settings {
  return { ...DEFAULT_SETTINGS };
}

function normalizeSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') return cloneDefaultSettings();

  const parsed = value as Partial<Settings>;
  const whatsappNumber = typeof parsed.whatsappNumber === 'string' ? parsed.whatsappNumber.trim() : '';
  const storeName = typeof parsed.storeName === 'string' ? parsed.storeName.trim() : '';
  const heroImageUrl = typeof parsed.heroImageUrl === 'string' ? parsed.heroImageUrl.trim() : '';
  const adminPassword = typeof parsed.adminPassword === 'string' ? parsed.adminPassword : DEFAULT_SETTINGS.adminPassword;

  return {
    whatsappNumber: whatsappNumber && whatsappNumber !== "5215555555555" ? whatsappNumber : DEFAULT_SETTINGS.whatsappNumber,
    storeName: storeName || DEFAULT_SETTINGS.storeName,
    adminPassword: adminPassword || DEFAULT_SETTINGS.adminPassword,
    heroImageUrl: heroImageUrl || DEFAULT_SETTINGS.heroImageUrl,
  };
}

export const SEED_PRODUCTS: Product[] = [
  // --- ÁRABES (3) ---
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Club de Nuit Intense Man",
    brand: "Armaf",
    price: 1350,
    originalPrice: 1600,
    stock: 5,
    imageUrl: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=600&auto=format&fit=crop",
    description: "Un perfume árabe sumamente popular que evoca la frescura cítrica combinada con un corazón ahumado y amaderado. Excelente proyección y duración.",
    notes: {
      top: "Limón, Piña, Bergamota, Grosellas Negras, Manzana",
      heart: "Abedul, Jazmín, Rosa",
      base: "Almizcle, Ámbar Gris, Pachulí, Vainilla"
    },
    category: "Árabes",
    featured: true
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Khamrah",
    brand: "Lattafa",
    price: 1250,
    originalPrice: 1500,
    stock: 3,
    imageUrl: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=600&auto=format&fit=crop",
    description: "Un perfume árabe premium dulce y lujoso, con un aroma cálido y embriagador a coñac, dátiles, canela y praliné. De las fragancias más virales y deseadas.",
    notes: {
      top: "Canela, Nuez Moscada, Bergamota",
      heart: "Dátiles, Praliné, Nardos, Lirio de los Valles",
      base: "Vainilla, Haba Tonka, Mirra, Benjuí, Madera de Akigala, Amberwood"
    },
    category: "Árabes",
    featured: true
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Yara",
    brand: "Lattafa",
    price: 1150,
    originalPrice: 1400,
    stock: 4,
    imageUrl: "https://images.unsplash.com/photo-1588405748373-122b25c86a28?q=80&w=600&auto=format&fit=crop",
    description: "Un perfume árabe femenino dulce y cremoso con notas tropicales, vainilla y un toque atalcado gourmand irresistible. Una delicia olfativa.",
    notes: {
      top: "Heliotropo, Mandarina, Orquídea",
      heart: "Notas Tropicales, Notas Gourmet",
      base: "Vainilla, Sándalo, Almizcle"
    },
    category: "Árabes",
    featured: true
  },
  // --- COMERCIALES (3) ---
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Sauvage Parfum",
    brand: "Dior",
    price: 2950,
    stock: 6,
    imageUrl: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=600&auto=format&fit=crop",
    description: "Una fragancia comercial icónica de frescura extrema combinada con tonos cálidos orientales de absoluto de vainilla y madera de sándalo.",
    notes: {
      top: "Bergamota de Reggio Calabria, Mandarina",
      heart: "Sándalo de Sri Lanka",
      base: "Absoluto de Vainilla de Papúa Nueva Guinea, Haba Tonka, Olibano"
    },
    category: "Comerciales",
    featured: true
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    name: "Libre Intense",
    brand: "Yves Saint Laurent",
    price: 3100,
    originalPrice: 3500,
    stock: 3,
    imageUrl: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=600&auto=format&fit=crop",
    description: "Un perfume comercial altamente sensual de lavanda francesa, flor de azahar del naranjo de Marruecos y vainilla cremosa.",
    notes: {
      top: "Lavanda, Mandarina, Bergamota",
      heart: "Flor de Azahar, Jazmín Sambac, Orquídea",
      base: "Vainilla de Madagascar, Haba Tonka, Ámbar Gris, Vetiver"
    },
    category: "Comerciales",
    featured: false
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    name: "Bleu de Chanel",
    brand: "Chanel",
    price: 2850,
    originalPrice: 3200,
    stock: 4,
    imageUrl: "https://images.unsplash.com/photo-1615396899839-c99c121888b0?q=80&w=600&auto=format&fit=crop",
    description: "Un perfume comercial aromático amaderado atemporal, elegante y fresco con notas cítricas e incienso misterioso.",
    notes: {
      top: "Toronja (Pomelo), Limón, Menta, Pimienta Rosa",
      heart: "Jazmín, Jengibre, Nuez Moscada",
      base: "Sándalo, Cedro, Incienso, Pachulí, Vetiver"
    },
    category: "Comerciales",
    featured: false
  },
  // --- NICHE (2) ---
  {
    id: "77777777-7777-7777-7777-777777777777",
    name: "Baccarat Rouge 540",
    brand: "Maison Francis Kurkdjian",
    price: 6900,
    stock: 2,
    imageUrl: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=600&auto=format&fit=crop",
    description: "Una de las fragancias de nicho más codiciadas del mundo, con una firma olfativa dulce ambarada de azafrán, jazmín y cedro.",
    notes: {
      top: "Azafrán, Jazmín",
      heart: "Madera de Ámbar, Ámbar Gris",
      base: "Resina de Abeto, Cedro"
    },
    category: "Niche",
    featured: true
  },
  {
    id: "88888888-8888-8888-8888-888888888888",
    name: "Lost Cherry",
    brand: "Tom Ford",
    price: 5800,
    originalPrice: 6300,
    stock: 3,
    imageUrl: "https://images.unsplash.com/photo-1588405748373-122b25c86a28?q=80&w=600&auto=format&fit=crop",
    description: "Una fragancia nicho que combina la cereza negra exótica, licor dulce de guinda y un toque cálido de almendra amarga.",
    notes: {
      top: "Cereza Negra, Licor de Cereza, Almendra Amarga",
      heart: "Rosa Turca, Jazmín Sambac, Jarabe de Guinda",
      base: "Bálsamo del Perú, Haba Tonka, Sándalo, Vetiver, Cedro"
    },
    category: "Niche",
    featured: false
  }
];

// Helper para verificar si estamos en el cliente
const isClient = typeof window !== 'undefined';

export const db = {
  // Ajustes
  getSettings(): Settings {
    if (!isClient) return cloneDefaultSettings();
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY) || localStorage.getItem('perfumazo_settings');
      if (stored) {
        const parsed = normalizeSettings(JSON.parse(stored));
        return parsed;
      }
      return cloneDefaultSettings();
    } catch {
      return cloneDefaultSettings();
    }
  },

  saveSettings(settings: Settings): Settings {
    if (!isClient) return cloneDefaultSettings();
    try {
      const normalized = normalizeSettings(settings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT, { detail: normalized }));
      return normalized;
    } catch (e) {
      console.error("Error saving settings", e);
      throw new Error("No fue posible guardar los ajustes. Verifica el espacio disponible del navegador e inténtalo de nuevo.");
    }
  },

  // Productos
  getProducts(): Product[] {
    if (!isClient) return SEED_PRODUCTS;
    try {
      const stored = localStorage.getItem('ozmo_cosmeticos_products') || localStorage.getItem('perfumazo_products');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      localStorage.setItem('ozmo_cosmeticos_products', JSON.stringify(SEED_PRODUCTS));
      return SEED_PRODUCTS;
    } catch {
      return SEED_PRODUCTS;
    }
  },

  resetProductsToSeed(): void {
    if (!isClient) return;
    try {
      localStorage.setItem('ozmo_cosmeticos_products', JSON.stringify(SEED_PRODUCTS));
    } catch (e) {
      console.error("Error resetting products", e);
    }
  },

  saveProduct(product: Product): void {
    if (!isClient) return;
    try {
      const products = this.getProducts();
      const index = products.findIndex(p => p.id === product.id);
      if (index > -1) {
        products[index] = product;
      } else {
        products.push(product);
      }
      localStorage.setItem('ozmo_cosmeticos_products', JSON.stringify(products));
    } catch (e) {
      console.error("Error saving product", e);
    }
  },

  deleteProduct(id: string): void {
    if (!isClient) return;
    try {
      const products = this.getProducts();
      const filtered = products.filter(p => p.id !== id);
      localStorage.setItem('ozmo_cosmeticos_products', JSON.stringify(filtered));
    } catch (e) {
      console.error("Error deleting product", e);
    }
  },

  // Pedidos
  getOrders(): Order[] {
    if (!isClient) return [];
    try {
      const stored = localStorage.getItem('ozmo_cosmeticos_orders') || localStorage.getItem('perfumazo_orders');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveOrder(order: Order): void {
    if (!isClient) return;
    try {
      const orders = this.getOrders();
      orders.push(order);
      localStorage.setItem('ozmo_cosmeticos_orders', JSON.stringify(orders));
    } catch (e) {
      console.error("Error saving order", e);
    }
  },

  clearOrders(): void {
    if (!isClient) return;
    try {
      localStorage.removeItem('ozmo_cosmeticos_orders');
      localStorage.removeItem('perfumazo_orders');
    } catch (e) {
      console.error("Error clearing orders", e);
    }
  },

  updateOrderStatus(orderId: string, newStatus: 'Pendiente' | 'Confirmado' | 'Cancelado'): void {
    if (!isClient) return;
    try {
      const orders = this.getOrders();
      const orderIndex = orders.findIndex(o => o.id === orderId);
      if (orderIndex === -1) return;

      const order = orders[orderIndex];
      const oldStatus = order.status;

      if (oldStatus === newStatus) return;

      // Actualizar el estado
      order.status = newStatus;
      orders[orderIndex] = order;
      localStorage.setItem('ozmo_cosmeticos_orders', JSON.stringify(orders));

      // Aplicar reglas de negocio para el stock
      const products = this.getProducts();

      // Regla: "Descontar stock solo al confirmar venta"
      if (newStatus === 'Confirmado' && oldStatus !== 'Confirmado') {
        // Descontamos stock
        order.items.forEach(item => {
          const productIndex = products.findIndex(p => p.id === item.productId);
          if (productIndex > -1) {
            products[productIndex].stock = Math.max(0, products[productIndex].stock - item.quantity);
          }
        });
        localStorage.setItem('ozmo_cosmeticos_products', JSON.stringify(products));
      } 
      // Si cambia de Confirmado a Pendiente o Cancelado, regresamos el stock
      else if (oldStatus === 'Confirmado' && newStatus !== 'Confirmado') {
        order.items.forEach(item => {
          const productIndex = products.findIndex(p => p.id === item.productId);
          if (productIndex > -1) {
            products[productIndex].stock += item.quantity;
          }
        });
        localStorage.setItem('ozmo_cosmeticos_products', JSON.stringify(products));
      }
    } catch (e) {
      console.error("Error updating order status", e);
    }
  }
};

export async function fetchSettingsFromSupabase(): Promise<Settings> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.warn('[OZMO] Error al leer store_settings desde Supabase:', error.message, error.details);
      return db.getSettings();
    }

    if (data) {
      const fetched: Settings = {
        storeName: data.store_name,
        whatsappNumber: data.whatsapp_number,
        heroImageUrl: data.hero_image_url,
        adminPassword: data.admin_password,
      };
      const normalized = normalizeSettings(fetched);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
        window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT, { detail: normalized }));
      }
      console.log('[OZMO] Ajustes cargados desde Supabase correctamente:', normalized.storeName);
      return normalized;
    } else {
      console.warn('[OZMO] No se encontró fila en store_settings (id=1). Asegúrate de ejecutar el SQL de migración en Supabase.');
    }
  } catch (err) {
    console.warn('[OZMO] Excepción al consultar store_settings en Supabase:', err);
  }
  return db.getSettings();
}

function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export async function saveSettingsToSupabase(
  newSettings: Settings,
  heroFile?: File | null
): Promise<Settings> {
  const errors: string[] = [];
  let heroImageUrl = newSettings.heroImageUrl || '';

  // 1. Carga de Imagen (Logo/Banner) al bucket público 'store-assets'
  let targetFile = heroFile;
  if (!targetFile && heroImageUrl.startsWith('data:image/')) {
    try {
      targetFile = dataURLtoFile(heroImageUrl, `hero_banner_${Date.now()}.png`);
    } catch (e) {
      console.warn('[OZMO] No se pudo convertir data URL a archivo para subir:', e);
    }
  }

  if (targetFile) {
    try {
      const fileExt = targetFile.name.split('.').pop() || 'png';
      const fileName = `hero_banner_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(fileName, targetFile, { upsert: true, contentType: targetFile.type });

      if (uploadError) {
        console.error('[OZMO] Error subiendo imagen a Storage (store-assets):', uploadError);
        errors.push(`Error al subir imagen: ${uploadError.message}`);
      } else if (uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('store-assets')
          .getPublicUrl(fileName);
        if (publicUrlData?.publicUrl) {
          heroImageUrl = publicUrlData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.error('[OZMO] Excepción durante subida a Storage:', storageErr);
      errors.push('Error de conexión al subir imagen.');
    }
  }

  const normalizedSettings: Settings = {
    ...newSettings,
    heroImageUrl,
  };

  // 2. Cambio de Contraseña vía Supabase Auth (no bloquea si falla)
  if (normalizedSettings.adminPassword) {
    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: normalizedSettings.adminPassword
      });
      if (authError) {
        console.warn('[OZMO] Supabase Auth password update:', authError.message);
      }
    } catch (authErr) {
      console.warn('[OZMO] Excepción en supabase.auth.updateUser:', authErr);
    }
  }

  // 3. Persistencia en la tabla 'store_settings' de Supabase Database (CRÍTICO)
  try {
    const { error: dbError } = await supabase
      .from('store_settings')
      .upsert({
        id: 1,
        store_name: normalizedSettings.storeName,
        whatsapp_number: normalizedSettings.whatsappNumber,
        hero_image_url: normalizedSettings.heroImageUrl,
        admin_password: normalizedSettings.adminPassword,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (dbError) {
      console.error('[OZMO] Error al guardar store_settings en Supabase:', dbError);
      errors.push(`Error en base de datos: ${dbError.message}`);
    } else {
      console.log('[OZMO] Ajustes guardados en Supabase correctamente.');
    }
  } catch (dbErr) {
    console.error('[OZMO] Excepción al guardar store_settings en Supabase:', dbErr);
    errors.push('Error de conexión con la base de datos de Supabase.');
  }

  // 4. Actualizar Local Storage y notificar eventos locales (siempre se ejecuta)
  const saved = db.saveSettings(normalizedSettings);

  // 5. Si hubo errores en Supabase, informar al administrador
  if (errors.length > 0) {
    throw new Error(
      `Los cambios se guardaron localmente, pero hubo problemas con Supabase:\n• ${errors.join('\n• ')}\n\nVerifica que la tabla store_settings exista en Supabase y que el bucket store-assets esté configurado.`
    );
  }

  return saved;
}
