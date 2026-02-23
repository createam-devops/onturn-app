# Instrucciones: Sistema de Disponibilidad de Especialistas

## 📋 Resumen

Esta funcionalidad permite a los administradores configurar los horarios semanales de disponibilidad de sus especialistas, lo que es fundamental para que el sistema de reservas funcione correctamente.

## 🗄️ Paso 1: Crear Tablas en Supabase

### Acceder al Editor SQL
1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar tu proyecto
3. Ir a **SQL Editor** en el menú lateral
4. Hacer clic en **New Query**

### Ejecutar el Script
1. Abrir el archivo `scripts/add-specialist-availability.sql`
2. Copiar **TODO** el contenido (204 líneas)
3. Pegarlo en el editor SQL de Supabase
4. Hacer clic en **Run** o presionar `Ctrl/Cmd + Enter`

### Verificar Creación
Deberías ver un mensaje de éxito y las siguientes confirmaciones:
```
✅ Tablas creadas:
   - specialist_availability
   - specialist_blocked_slots

✅ Políticas RLS configuradas

✅ Índices creados para optimización
```

**IMPORTANTE:** Si ves un error de "tabla ya existe", verifica en el Table Editor si las tablas ya están creadas. Si es así, puedes omitir este paso.

## 🎨 Paso 2: Usar la Interfaz

### Acceder a la Página
1. Iniciar sesión como **admin** de un negocio
2. Ir al menú lateral de administración
3. Hacer clic en **"Disponibilidad"** (o ir a `/admin/disponibilidad`)

### Configurar Horarios

#### Seleccionar Especialista
- Verás una lista de todos tus especialistas
- Haz clic en el especialista que quieres configurar
- Se marcará como "Seleccionado"

#### Agregar Horarios
1. Haz clic en **"Agregar Horario"** para el día deseado
2. Selecciona la **hora de inicio** (ej: 09:00)
3. Selecciona la **hora de fin** (ej: 13:00)
4. Puedes agregar múltiples bloques por día (ej: mañana y tarde)

#### Copiar Horarios Entre Días
1. Configura completamente un día (ej: Lunes)
2. Haz clic en **"Copiar"** en ese día
3. Ve a otro día (ej: Martes) y haz clic en **"Pegar desde Lun"**
4. Los horarios se copiarán automáticamente

#### Eliminar Horarios
- Haz clic en el ícono de **basura** (🗑️) junto al horario que quieres quitar

#### Guardar Cambios
- Haz clic en **"Guardar Cambios"** en la parte superior derecha
- Espera el mensaje de confirmación: ✅ Disponibilidad guardada exitosamente

## 🏗️ Estructura de la Base de Datos

### Tabla: `specialist_availability`
Almacena los horarios recurrentes (semanales) de cada especialista.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único |
| `specialist_id` | uuid | Referencia al especialista |
| `day_of_week` | int | Día de la semana (0=Domingo, 6=Sábado) |
| `start_time` | time | Hora de inicio (ej: 09:00:00) |
| `end_time` | time | Hora de fin (ej: 17:00:00) |
| `is_available` | boolean | Si está disponible (normalmente true) |
| `created_at` | timestamptz | Fecha de creación |
| `updated_at` | timestamptz | Última actualización |

**Ejemplo de datos:**
```sql
-- Lunes a Viernes: 9:00 AM - 1:00 PM y 3:00 PM - 7:00 PM
specialist_id: "abc-123"
day_of_week: 1 (Lunes)
start_time: "09:00:00"
end_time: "13:00:00"

specialist_id: "abc-123"
day_of_week: 1 (Lunes)
start_time: "15:00:00"
end_time: "19:00:00"
```

### Tabla: `specialist_blocked_slots`
Almacena bloqueos específicos (vacaciones, días festivos, permisos).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único |
| `specialist_id` | uuid | Referencia al especialista |
| `blocked_date` | date | Fecha del bloqueo |
| `start_time` | time | Hora de inicio (opcional) |
| `end_time` | time | Hora de fin (opcional) |
| `reason` | text | Motivo del bloqueo |
| `created_by` | uuid | Usuario que creó el bloqueo |
| `created_at` | timestamptz | Fecha de creación |

**Ejemplo de datos:**
```sql
-- Vacaciones de Navidad (día completo)
specialist_id: "abc-123"
blocked_date: "2024-12-25"
start_time: null
end_time: null
reason: "Feriado - Navidad"

-- Cita médica (bloqueo parcial)
specialist_id: "abc-123"
blocked_date: "2024-06-15"
start_time: "14:00:00"
end_time: "16:00:00"
reason: "Cita médica"
```

## 🔒 Seguridad (RLS)

### Políticas Configuradas

#### Lectura Pública
- ✅ Cualquier usuario puede **ver** la disponibilidad de especialistas
- Necesario para que los clientes vean horarios disponibles al reservar

#### Escritura Restringida
- ✅ Solo **propietarios del negocio** pueden crear/actualizar/eliminar horarios
- Verificación automática: `business_id` del especialista = `business_id` del usuario
- Previene que un negocio modifique horarios de otro negocio

## 📊 Próximos Pasos

Una vez configurada la disponibilidad:

### **Paso 3: Cálculo de Slots Disponibles** (Próxima tarea)
- Crear función `getAvailableSlots()` que cruce:
  - ✅ Horarios del especialista (specialist_availability)
  - ✅ Citas ya reservadas (appointments)
  - ✅ Bloqueos específicos (specialist_blocked_slots)
  - ✅ Horarios del negocio (business_hours)
- Retornar slots reales disponibles para reservar

### **Paso 4: Integrar en Página de Reservas**
- Actualizar `/[slug]/reservar/page.tsx`
- Mostrar calendario con slots reales (no input manual)
- Prevenir doble reserva automáticamente

## 🧪 Cómo Probar

### Test Manual
1. Crear un especialista de prueba (si no tienes)
2. Ir a `/admin/disponibilidad`
3. Configurar horarios:
   - Lunes: 09:00 - 13:00
   - Lunes: 15:00 - 19:00
   - Copiar a Martes, Miércoles, Jueves, Viernes
4. Guardar cambios
5. Verificar en Supabase Table Editor que los datos se guardaron:
   ```sql
   SELECT * FROM specialist_availability 
   WHERE specialist_id = 'tu-especialista-id'
   ORDER BY day_of_week, start_time;
   ```

### Query de Verificación
```sql
-- Ver disponibilidad formateada
SELECT 
  s.full_name,
  CASE sa.day_of_week
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Lunes'
    WHEN 2 THEN 'Martes'
    WHEN 3 THEN 'Miércoles'
    WHEN 4 THEN 'Jueves'
    WHEN 5 THEN 'Viernes'
    WHEN 6 THEN 'Sábado'
  END as dia,
  sa.start_time as desde,
  sa.end_time as hasta
FROM specialist_availability sa
JOIN specialists s ON s.id = sa.specialist_id
WHERE s.business_id = 'tu-business-id'
ORDER BY sa.day_of_week, sa.start_time;
```

## ⚠️ Troubleshooting

### Error: "No se encontró el ID del negocio"
**Causa:** El usuario no tiene un `businessId` asociado  
**Solución:**
1. Verificar en Supabase que el perfil tiene `business_id`
2. Cerrar sesión y volver a iniciar
3. Verificar rol: debe ser `tenant_owner` o `admin`

### Error: "Error al cargar disponibilidad"
**Causa:** Las tablas no existen en Supabase  
**Solución:**
1. Ejecutar `scripts/add-specialist-availability.sql` en SQL Editor
2. Verificar que las tablas se crearon correctamente

### Error: "Error al guardar disponibilidad"
**Causa:** Políticas RLS bloqueando la operación  
**Solución:**
1. Verificar que tu usuario tiene `business_id`
2. Verificar que el especialista pertenece a tu negocio
3. Revisar políticas RLS en Supabase Dashboard

### Los horarios no aparecen
**Causa:** Filtro `is_available = true` en el servicio  
**Solución:**
1. Verificar en la BD que `is_available` sea `true`
2. Si guardaste con `is_available: false`, actualizar a `true`

## 📁 Archivos Relacionados

- `scripts/add-specialist-availability.sql` - Script de creación de tablas
- `types/specialist.ts` - Interfaces TypeScript
- `lib/services/specialists.ts` - Funciones de acceso a BD
- `components/admin/AvailabilityCalendar.tsx` - Componente de calendario
- `app/admin/disponibilidad/page.tsx` - Página de administración

## ✅ Checklist de Implementación

- [ ] Ejecutar SQL en Supabase
- [ ] Verificar creación de tablas
- [ ] Verificar políticas RLS activas
- [ ] Probar acceso a `/admin/disponibilidad`
- [ ] Configurar horarios de un especialista
- [ ] Guardar y verificar en BD
- [ ] Probar copiar entre días
- [ ] Probar eliminar horarios
- [ ] Verificar que otros negocios no pueden ver/editar tus horarios

---

**Fecha de creación:** Junio 2024  
**Versión:** 1.0  
**Parte de:** FASE 2 - Funcionalidades Avanzadas
