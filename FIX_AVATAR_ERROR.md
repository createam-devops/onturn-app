# Fix: Error al Crear Especialistas (Campo Avatar)

## 🐛 Problema Encontrado

Al intentar crear o editar un especialista, aparecía el siguiente error:

```
POST https://atxldtjknfbcwnnqxkov.supabase.co/rest/v1/specialists 400 (Bad Request)
PGRST204: Could not find the 'avatar' column of 'specialists' in the schema cache
```

## 🔍 Causa

El código frontend en [`app/admin/especialistas/page.tsx`](app/admin/especialistas/page.tsx) intentaba insertar/actualizar un campo `avatar` en la tabla `specialists`, pero esa **columna no existe en la base de datos de Supabase**.

### ¿Por qué pasó esto?

El schema local (`scripts/setup-database.sql`) sí define la columna `avatar`, pero cuando se creó la base de datos en Supabase, aparentemente esa columna no se agregó o se eliminó posteriormente.

## ✅ Solución Aplicada

Se **comentaron temporalmente** todas las referencias al campo `avatar` en el código frontend:

### Cambios en `app/admin/especialistas/page.tsx`:

1. **Estado del formulario** (línea ~56):
   ```tsx
   const [formData, setFormData] = useState({
     name: '',
     email: '',
     phone: '',
     specialty_id: '',
     // avatar: '', // Temporarily disabled - column doesn't exist
   })
   ```

2. **Actualización de especialista** (línea ~155):
   ```tsx
   .update({
     name: formData.name.trim(),
     email: formData.email.trim() || null,
     phone: formData.phone.trim() || null,
     specialty_id: formData.specialty_id || null,
     // avatar: formData.avatar.trim() || null, // Disabled
   })
   ```

3. **Creación de especialista** (línea ~195):
   ```tsx
   .insert({
     business_id: business.id,
     name: formData.name.trim(),
     email: formData.email.trim() || null,
     phone: formData.phone.trim() || null,
     specialty_id: formData.specialty_id || null,
     // avatar: formData.avatar.trim() || null, // Disabled
     is_active: true,
   })
   ```

4. **Componente ImageUpload** (líneas ~369-383):
   ```tsx
   {/* Avatar field temporarily disabled - column doesn't exist in Supabase
   <div>
     <label>Avatar</label>
     <ImageUpload ... />
   </div>
   */}
   ```

5. **Import de ImageUpload** (línea ~13):
   ```tsx
   // import { ImageUpload } from '@/components/shared/ImageUpload' // Disabled
   ```

## 📋 Próximos Pasos (Opcional)

Si en el futuro quieres **habilitar avatares** de especialistas:

### 1. Ejecutar SQL en Supabase

Ir a [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor → Ejecutar:

```sql
-- Archivo: scripts/add-avatar-column.sql
ALTER TABLE specialists ADD COLUMN avatar TEXT;
```

O ejecutar el script completo: [`scripts/add-avatar-column.sql`](scripts/add-avatar-column.sql)

### 2. Descomentar el código en `app/admin/especialistas/page.tsx`

Buscar todos los comentarios que dicen `// Disabled` o `Temporarily disabled` y descomentar:
- Línea ~56: `avatar: ''`
- Línea ~13: `import { ImageUpload }`
- Línea ~160: `avatar: formData.avatar.trim() || null,`
- Línea ~199: `avatar: formData.avatar.trim() || null,`
- Línea ~209: `, avatar: ''`
- Línea ~227: `avatar: specialist.avatar || '',`
- Líneas ~369-383: Todo el componente `<ImageUpload>`

### 3. Verificar Storage en Supabase

Asegurarse de que el bucket `avatars` existe:
- Ir a **Storage** → **Buckets**
- Si no existe, crear bucket `avatars` con acceso **público**

### 4. Probar

- Ir a `/admin/especialistas`
- Crear o editar un especialista
- Subir un avatar
- Verificar que aparece correctamente

## 🎯 Resultado

✅ **Ahora puedes crear y editar especialistas sin errores**  
⚠️ Sin funcionalidad de avatar (opcional - se puede agregar después)

## 📝 Archivos Modificados

- ✅ [`app/admin/especialistas/page.tsx`](app/admin/especialistas/page.tsx) - Referencias a avatar comentadas
- ✅ [`scripts/add-avatar-column.sql`](scripts/add-avatar-column.sql) - Script para agregar columna (futuro)

---

**Fecha:** Febrero 22, 2026  
**Estado:** ✅ Resuelto - Funcionalidad restaurada sin avatares
