/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product } from '@/lib/db';

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

export function useProductosRealtime() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch inicial de productos
    const fetchProductos = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .order('marca', { ascending: true })
          .order('nombre', { ascending: true });

        if (error) throw error;

        if (data) {
          setProducts(data.map(mapDbProductToApp));
        }
      } catch (err: any) {
        console.error('Error fetching products from Supabase:', err);
        setError(err.message || 'Error al cargar productos');
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();

    // 2. Habilitar canal de suscripción en tiempo real
    const channel = supabase
      .channel('cambios-stock')
      .on(
        'postgres_changes',
        {
          event: '*', // UPDATE, INSERT, DELETE
          schema: 'public',
          table: 'productos'
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'INSERT' && newRow) {
            const mapped = mapDbProductToApp(newRow);
            setProducts((current) => {
              // Evitar duplicaciones por si acaso
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

    // Limpieza de canal al desmontar el Hook
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { products, loading, error, setProducts };
}
