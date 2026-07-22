import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product, SEED_PRODUCTS } from '@/lib/db';

// Helper para mapear columnas snake_case de Postgres a propiedades camelCase de TypeScript
export const mapDbProductToApp = (p: any): Product => ({
  id: p.id,
  name: p.nombre,
  brand: p.marca,
  price: Number(p.precio),
  originalPrice: p.precio_original ? Number(p.precio_original) : undefined,
  stock: Number(p.stock),
  imageUrl: p.imagen_url,
  description: p.descripcion || '',
  notes: {
    top: p.notas_salida || '',
    heart: p.notas_corazon || '',
    base: p.notas_fondo || ''
  },
  category: p.categoria as any,
  featured: false
});

// Función para sembrar Supabase con los 8 productos iniciales de fábrica
export async function seedSupabaseProducts() {
  try {
    const dbRows = SEED_PRODUCTS.map(p => ({
      id: p.id,
      nombre: p.name,
      marca: p.brand,
      precio: p.price,
      precio_original: p.originalPrice || null,
      stock: p.stock,
      imagen_url: p.imageUrl,
      descripcion: p.description,
      categoria: p.category,
      notas_salida: p.notes.top,
      notas_corazon: p.notes.heart,
      notas_fondo: p.notes.base
    }));
    const { error } = await supabase.from('productos').upsert(dbRows, { onConflict: 'id' });
    if (error) {
      console.error('Error seeding Supabase:', error);
    }
  } catch (e) {
    console.error('Exception seeding Supabase:', e);
  }
}

export function useProductosRealtime() {
  // CRITICAL FIX: Inicializar SIEMPRE con SEED_PRODUCTS directamente.
  // Esto garantiza que tanto el render del servidor (SSG) como el cliente
  // arranquen con 8 productos, eliminando el mismatch de hidratacion
  // que causaba inventario vacio en PC.
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Fetch productos desde Supabase - si tiene datos, reemplaza los seed
    const fetchProductos = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('productos')
          .select('*')
          .order('marca', { ascending: true })
          .order('nombre', { ascending: true });

        if (fetchError) throw fetchError;

        if (!cancelled) {
          if (data && data.length > 0) {
            setProducts(data.map(mapDbProductToApp));
          } else {
            // Supabase está vacío: sembrar productos automáticamente
            await seedSupabaseProducts();
            setProducts(SEED_PRODUCTS);
          }
        }
      } catch (err: any) {
        console.error('Error fetching products from Supabase:', err);
        if (!cancelled) {
          setError(err.message || 'Error al cargar productos');
          setProducts(SEED_PRODUCTS);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProductos();

    // Habilitar canal de suscripcion en tiempo real
    const channel = supabase
      .channel('cambios-stock')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'productos'
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'INSERT' && newRow) {
            const mapped = mapDbProductToApp(newRow);
            setProducts((current) => {
              if (current.some((p) => p.id === mapped.id)) return current;
              return [...current, mapped];
            });
          } else if (eventType === 'UPDATE' && newRow) {
            const mapped = mapDbProductToApp(newRow);
            setProducts((current) =>
              current.map((p) => (p.id === mapped.id ? mapped : p))
            );
          } else if (eventType === 'DELETE' && oldRow) {
            setProducts((current) =>
              current.filter((p) => p.id !== oldRow.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { products, loading, error, setProducts };
}
