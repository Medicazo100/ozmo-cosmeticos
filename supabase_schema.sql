-- =====================================================================
-- SCRIPT DE MIGRACIÓN DE BASE DE DATOS PARA SUPABASE (POSTGRESQL)
-- Proyecto: OZMO Cosméticos y Perfumes
-- Ejecutar este script en el SQL Editor de tu Dashboard de Supabase.
-- =====================================================================

-- 1. Crear la tabla de productos
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    marca TEXT NOT NULL,
    precio NUMERIC NOT NULL,
    precio_original NUMERIC,
    stock INTEGER NOT NULL DEFAULT 0,
    imagen_url TEXT,
    descripcion TEXT,
    categoria TEXT NOT NULL DEFAULT 'Comerciales',
    notas_salida TEXT,
    notas_corazon TEXT,
    notas_fondo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar permisos públicos para lectura de la tabla de productos
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir operaciones públicas en desarrollo (o ajusta según producción)
CREATE POLICY "Permitir lectura pública de productos" ON public.productos
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserción pública de productos" ON public.productos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualización pública de productos" ON public.productos
    FOR UPDATE USING (true);

CREATE POLICY "Permitir eliminación pública de productos" ON public.productos
    FOR DELETE USING (true);

-- 2. Habilitar la replicación de Supabase Realtime para la tabla 'productos'
-- Esto permite escuchar cambios de inserción, actualización y borrado en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.productos;

-- 3. Crear la función RPC para decrementar atómicamente el stock ("Venta presencial")
-- Esta función asegura que el stock se reduzca en 1 de forma segura sin bajar de 0
CREATE OR REPLACE FUNCTION public.registrar_venta_presencial(product_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.productos
    SET stock = GREATEST(0, stock - 1)
    WHERE id = product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Insertar datos semilla (Seed Data)
-- Insertamos los perfumes de demostración iniciales con UUIDs estáticos para consistencia
INSERT INTO public.productos (id, nombre, marca, precio, precio_original, stock, imagen_url, descripcion, categoria, notas_salida, notas_corazon, notas_fondo)
VALUES
-- --- ÁRABES (3) ---
(
    '11111111-1111-1111-1111-111111111111',
    'Club de Nuit Intense Man',
    'Armaf',
    1350,
    1600,
    5,
    'https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=600&auto=format&fit=crop',
    'Un perfume árabe sumamente popular que evoca la frescura cítrica combinada con un corazón ahumado y amaderado. Excelente proyección y duración.',
    'Árabes',
    'Limón, Piña, Bergamota, Grosellas Negras, Manzana',
    'Abedul, Jazmín, Rosa',
    'Almizcle, Ámbar Gris, Pachulí, Vainilla'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Khamrah',
    'Lattafa',
    1250,
    1500,
    3,
    'https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=600&auto=format&fit=crop',
    'Un perfume árabe premium dulce y lujoso, con un aroma cálido y embriagador a coñac, dátiles, canela y praliné. De las fragancias más virales y deseadas.',
    'Árabes',
    'Canela, Nuez Moscada, Bergamota',
    'Dátiles, Praliné, Nardos, Lirio de los Valles',
    'Vainilla, Haba Tonka, Mirra, Benjuí, Madera de Akigala, Amberwood'
),
(
    '33333333-3333-3333-3333-333333333333',
    'Yara',
    'Lattafa',
    1150,
    1400,
    4,
    'https://images.unsplash.com/photo-1588405748373-122b25c86a28?q=80&w=600&auto=format&fit=crop',
    'Un perfume árabe femenino dulce y cremoso con notas tropicales, vainilla y un toque atalcado gourmand irresistible. Una delicia olfativa.',
    'Árabes',
    'Heliotropo, Mandarina, Orquídea',
    'Notas Tropicales, Notas Gourmet',
    'Vainilla, Sándalo, Almizcle'
),
-- --- COMERCIALES (3) ---
(
    '44444444-4444-4444-4444-444444444444',
    'Sauvage Parfum',
    'Dior',
    2950,
    NULL,
    6,
    'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=600&auto=format&fit=crop',
    'Una fragancia comercial icónica de frescura extrema combinada con tonos cálidos orientales de absoluto de vainilla y madera de sándalo.',
    'Comerciales',
    'Bergamota de Reggio Calabria, Mandarina',
    'Sándalo de Sri Lanka',
    'Absoluto de Vainilla de Papúa Nueva Guinea, Haba Tonka, Olibano'
),
(
    '55555555-5555-5555-5555-555555555555',
    'Libre Intense',
    'Yves Saint Laurent',
    3100,
    3500,
    3,
    'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=600&auto=format&fit=crop',
    'Un perfume comercial altamente sensual de lavanda francesa, flor de azahar del naranjo de Marruecos y vainilla cremosa.',
    'Comerciales',
    'Lavanda, Mandarina, Bergamota',
    'Flor de Azahar, Jazmín Sambac, Orquídea',
    'Vainilla de Madagascar, Haba Tonka, Ámbar Gris, Vetiver'
),
(
    '66666666-6666-6666-6666-666666666666',
    'Bleu de Chanel',
    'Chanel',
    2850,
    3200,
    4,
    'https://images.unsplash.com/photo-1615396899839-c99c121888b0?q=80&w=600&auto=format&fit=crop',
    'Un perfume comercial aromático amaderado atemporal, elegante y fresco con notas cítricas e incienso misterioso.',
    'Comerciales',
    'Toronja (Pomelo), Limón, Menta, Pimienta Rosa',
    'Jazmín, Jengibre, Nuez Moscada',
    'Sándalo, Cedro, Incienso, Pachulí, Vetiver'
),
-- --- NICHE (2) ---
(
    '77777777-7777-7777-7777-777777777777',
    'Baccarat Rouge 540',
    'Maison Francis Kurkdjian',
    6900,
    NULL,
    2,
    'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=600&auto=format&fit=crop',
    'Una de las fragancias de nicho más codiciadas del mundo, con una firma olfativa dulce ambarada de azafrán, jazmín y cedro.',
    'Niche',
    'Azafrán, Jazmín',
    'Madera de Ámbar, Ámbar Gris',
    'Resina de Abeto, Cedro'
),
(
    '88888888-8888-8888-8888-888888888888',
    'Lost Cherry',
    'Tom Ford',
    5800,
    6300,
    3,
    'https://images.unsplash.com/photo-1588405748373-122b25c86a28?q=80&w=600&auto=format&fit=crop',
    'Una fragancia nicho que combina la cereza negra exótica, licor dulce de guinda y un toque cálido de almendra amarga.',
    'Niche',
    'Cereza Negra, Licor de Cereza, Almendra Amarga',
    'Rosa Turca, Jazmín Sambac, Jarabe de Guinda',
    'Bálsamo del Perú, Haba Tonka, Sándalo, Vetiver, Cedro'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Crear la tabla de configuración de la tienda (store_settings)
CREATE TABLE IF NOT EXISTS public.store_settings (
    id INT PRIMARY KEY DEFAULT 1,
    store_name TEXT NOT NULL DEFAULT 'OZMO Cosméticos y Perfumes',
    whatsapp_number TEXT NOT NULL DEFAULT '524535303820',
    hero_image_url TEXT DEFAULT '/hero_banner.png',
    admin_password TEXT DEFAULT 'admin',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Habilitar RLS en store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para store_settings
CREATE POLICY "Permitir lectura pública de store_settings" ON public.store_settings
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserción pública de store_settings" ON public.store_settings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualización de store_settings" ON public.store_settings
    FOR UPDATE USING (true);

-- Insertar configuración inicial por defecto
INSERT INTO public.store_settings (id, store_name, whatsapp_number, hero_image_url, admin_password)
VALUES (1, 'OZMO Cosméticos y Perfumes', '524535303820', '/hero_banner.png', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Habilitar Realtime para store_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;

-- 6. Configuración de Storage Bucket (store-assets) para logo / banners de tienda
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Permitir lectura pública en store-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-assets');

CREATE POLICY "Permitir subida en store-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Permitir actualización en store-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'store-assets');

