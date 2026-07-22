import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product, SEED_PRODUCTS } from '@/lib/db';

type ProductCategory = Product['category'];

export type SupabaseProductRow = {
  id: string;
  nombre: string;
  marca: string;
  precio: number | string;
  precio_original: number | string | null;
  stock: number | string;
  imagen_url: string | null;
  descripcion: string | null;
  categoria: string | null;
  notas_salida: string | null;
  notas_corazon: string | null;
  notas_fondo: string | null;
};

function normalizeCategory(value: unknown): ProductCategory {
  const category = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  if (category.includes('arabe') || category.includes('rabes')) return 'Árabes';
  if (category.includes('niche')) return 'Niche';
  return 'Comerciales';
}

const cloneProducts = (products: Product[]) =>
  products.map((product) => ({
    ...product,
    notes: { ...product.notes },
  }));

// Helper para mapear columnas snake_case de Postgres a propiedades camelCase de TypeScript
export const mapDbProductToApp = (p: SupabaseProductRow): Product => ({
  id: p.id,
  name: p.nombre,
  brand: p.marca,
  price: Number(p.precio),
  originalPrice: p.precio_original === null ? undefined : Number(p.precio_original),
  stock: Number(p.stock),
  imageUrl: p.imagen_url || '',
  description: p.descripcion || '',
  notes: {
    top: p.notas_salida || '',
    heart: p.notas_corazon || '',
    base: p.notas_fondo || '',
  },
  category: normalizeCategory(p.categoria),
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
  // El catálogo debe tener contenido útil aunque Supabase tarde, esté vacío o
  // no sea accesible desde un navegador de escritorio.
  const [products, setProducts] = useState<Product[]>(() => cloneProducts(SEED_PRODUCTS));
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

        if (!cancelled && data && data.length > 0) {
          setProducts(data.map(mapDbProductToApp));
        } else if (!cancelled) {
          // Pintar primero; la siembra remota no debe bloquear el catálogo.
          setProducts((current) => current.length > 0 ? current : cloneProducts(SEED_PRODUCTS));
          void seedSupabaseProducts();
        }
      } catch (err: unknown) {
        console.error('Error fetching products from Supabase:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar productos');
          setProducts((current) => current.length > 0 ? current : cloneProducts(SEED_PRODUCTS));
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
            const mapped = mapDbProductToApp(newRow as SupabaseProductRow);
            setProducts((current) => {
              if (current.some((p) => p.id === mapped.id)) return current;
              return [...current, mapped];
            });
          } else if (eventType === 'UPDATE' && newRow) {
            const mapped = mapDbProductToApp(newRow as SupabaseProductRow);
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
