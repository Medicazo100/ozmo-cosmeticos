# Guía de Despliegue: Perfumazo (Supabase & Vercel)

Esta guía detalla los pasos para migrar tu base de datos local a Supabase y desplegar la aplicación "Perfumazo" en Vercel.

---

## 1. Configuración de Base de Datos (Supabase)

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Ve al panel lateral de tu proyecto y selecciona **SQL Editor**.
3. Haz clic en **New query** y copia el contenido completo del archivo `supabase_schema.sql` (ubicado en la raíz del proyecto).
4. Haz clic en **Run** para crear la tabla de productos, habilitar Realtime, agregar la función RPC para ventas presenciales e insertar los 6 perfumes semilla.
5. Ve a **Project Settings** > **API** y copia las siguientes claves:
   - **Project URL**
   - **anon public API key**

---

## 2. Configuración de Despliegue en Vercel

### Variables de Entorno
Al importar tu repositorio en Vercel, debes agregar las siguientes **Environment Variables** en el panel de configuración del proyecto:

| Nombre de la Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | *Tu Project URL de Supabase* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Tu anon public API key de Supabase* |

---

## 3. Despliegue por Git (GitHub / GitLab / Bitbucket)

Vercel detecta de forma automática los cambios pushed a tu repositorio. Sigue estos pasos para conectar tu repositorio local a GitHub y Vercel:

1. **Inicializa tu repositorio de git si no lo has hecho:**
   ```bash
   git init
   git add .
   git commit -m "feat: migración a Supabase, soporte Realtime y PWA"
   ```

2. **Crea un repositorio en GitHub y asócialo:**
   ```bash
   git remote add origin https://github.com/TU_USUARIO/perfumazo.git
   git branch -M main
   git push -u origin main
   ```

3. **Conecta Vercel:**
   - Ve a [Vercel](https://vercel.com/) e inicia sesión.
   - Haz clic en **Add New** > **Project**.
   - Importa tu repositorio `perfumazo`.
   - Agrega las dos variables de entorno listadas en el Paso 2.
   - Haz clic en **Deploy**. ¡Tu app se compilará y desplegará automáticamente!

---

## 4. Despliegue por Vercel CLI (Alternativa sin GitHub)

Si deseas desplegar directamente desde tu terminal local utilizando el CLI de Vercel:

1. Instala el CLI de Vercel de forma global (si no lo tienes):
   ```bash
   npm install -g vercel
   ```
2. Ejecuta el comando de vinculación y sigue las instrucciones:
   ```bash
   vercel
   ```
3. Configura las variables de entorno utilizando el panel de Vercel Dashboard de tu nuevo proyecto.
4. Despliega a producción con:
   ```bash
   vercel --prod
   ```
