# Cómo recrear el proyecto de Supabase desde cero

Seguí estos pasos EN ORDEN. No te saltees ninguno — cada paso depende del anterior.

---

## 1. Crear el proyecto nuevo en Supabase

1. Entrá a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click en **"New project"**
3. Completá:
   - **Name:** el nombre que quieras (ej: `propmanager3`)
   - **Database password:** generá una nueva y **guardala en un lugar seguro** (gestor de contraseñas, nota, etc.)
   - **Region:** la misma que usabas antes (revisá cuál era)
4. Click en **"Create new project"**
5. Esperá unos minutos a que termine de aprovisionarse

---

## 2. Crear los buckets de Storage

Antes de correr el SQL, hace falta crear los buckets a mano:

1. En el menú lateral, click en **"Storage"**
2. Click en **"New bucket"**
3. Creá el bucket `invoices`
   - Marcalo como **privado** (no público)
4. Repetí y creá el bucket `receipts`
   - También privado

---

## 3. Correr el schema.sql

1. En el menú lateral, click en **"SQL Editor"**
2. Abrí el archivo `schema.sql` de este proyecto
3. Copiá **todo** el contenido y pegalo en el editor
4. Click en **"Run"**
5. Verificá que no haya errores en rojo

> Si Storage te tira error en la sección 6, es porque te saltaste el paso 2 (crear los buckets). Volvé arriba y creá los buckets primero.

---

## 4. Crear tu usuario admin

1. En el menú lateral, click en **"Authentication" → "Users"**
2. Click en **"Add user" → "Create new user"**
3. Completá tu email y una contraseña
4. **Importante:** copiá el UID que se genera para ese usuario (lo vas a necesitar en el paso siguiente)
5. Volvé al **SQL Editor** y corré:

```sql
update profiles
set role = 'admin', full_name = 'Tu Nombre'
where id = 'PEGÁ-ACÁ-EL-UID-QUE-COPIASTE';
```

---

## 5. Conseguir las credenciales nuevas

1. En el menú lateral, click en **"Project Settings" (ícono de engranaje) → "API"**
2. Copiá dos valores:
   - **Project URL**
   - **anon / public key**

---

## 6. Actualizar el `.env` local

1. Abrí el archivo `.env` en la raíz de tu proyecto
2. Reemplazá los valores viejos:

```
VITE_SUPABASE_URL=tu-nueva-url-acá
VITE_SUPABASE_ANON_KEY=tu-nueva-key-acá
```

3. Guardá el archivo
4. Si tenés el proyecto corriendo localmente, reiniciá el servidor (parar y volver a correr `npm run dev`)

---

## 7. Actualizar las variables de entorno en Vercel

Este es el paso que más nos costó la última vez — no te lo saltees.

1. Entrá a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Abrí tu proyecto
3. Click en **"Settings" → "Environment Variables"**
4. Buscá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
5. Editá cada una y pegá los valores nuevos del paso 5
6. Guardá los cambios

---

## 8. Redesplegar en Vercel

**Crítico:** las variables de entorno nuevas NO se aplican solas. Hay que forzar un nuevo deploy:

1. En Vercel, click en **"Deployments"**
2. Abrí el último deployment
3. Click en los tres puntitos (`...`) → **"Redeploy"**
4. Esperá a que termine

---

## 9. Probar que todo funciona

- [ ] Entrar a la app y loguearte con tu usuario admin
- [ ] Verificar que aparece la sección "Usuarios" en el menú
- [ ] Crear una propiedad de prueba
- [ ] Subir una factura de prueba en Servicios (para probar Storage)

Si algo falla, revisá la consola del navegador (F12 → Console) y la pestaña Network para ver el error exacto.