# 🚀 FASE 2 - Funcionalidades Avanzadas

## 📊 Estado: EN PROGRESO
**Inicio:** Febrero 22, 2026  
**Prioridad:** Funcionalidades críticas para operación completa

---

## 🎯 Objetivos de FASE 2

Completar las funcionalidades esenciales para que el sistema sea **100% operacional**:

1. ✅ **Calendario de disponibilidad** - Visualizar y gestionar horarios
2. ✅ **Cálculo de slots disponibles** - Sistema de reservas funcional
3. ✅ **Validación completa** - Todos los formularios con Zod
4. ✅ **Sistema de reviews** - Calificaciones y comentarios
5. ✅ **Analytics mejorado** - Reportes y métricas
6. ✅ **Notificaciones** - Email y/o push notifications

---

## 📋 Tareas Prioritarias

### 🔴 CRÍTICO - Semana 1  (5 días)

#### 1. Calendario de Disponibilidad de Especialistas ✅
**Problema actual:** Los especialistas no pueden definir cuándo están disponibles
**Impacto:** No se pueden reservar citas reales

**Tasks:**
- [x] **1.1** Componente UI: Calendario semanal visual (Lun-Dom)
  - ✅ Grid de horarios (08:00 - 23:30 en bloques de 30min)
  - ✅ Interfaz para agregar/editar/eliminar bloques de tiempo
  - ✅ Copiar disponibilidad entre días
  - ✅ Guardar cambios en `specialist_availability`
  - ✅ Archivo: `components/admin/AvailabilityCalendar.tsx` (229 líneas)
  
- [x] **1.2** Base de datos + Servicios
  - ✅ Tabla `specialist_availability` creada (recurre semanal)
  - ✅ Tabla `specialist_blocked_slots` creada (bloqueos puntuales)
  - ✅ RLS configurado (solo propietarios del negocio)
  - ✅ Índices para performance
  - ✅ Servicios ya existentes en `lib/services/specialists.ts`:
    - `getSpecialistAvailability(specialistId)`
    - `updateSpecialistAvailability(specialistId, availability)`
  - ⏸️ Falta: `blockTimeSlot()` para vacaciones (próxima iteración)
  
- [x] **1.3** Página: `/admin/disponibilidad`
  - ✅ Selector visual de especialista
  - ✅ Calendario semanal editable
  - ✅ Copiar entre días de la semana
  - ✅ Múltiples bloques por día (mañana/tarde)
  - ✅ Validación de horarios (30 min intervals)
  - ✅ Archivo: `app/admin/disponibilidad/page.tsx` (199 líneas)
  - ⏸️ Falta: UI para marcar días festivos (próxima iteración)

**Tiempo estimado:** 2-3 días  
**Tiempo real:** 1 día ⚡  

**Archivos creados:**
- ✅ `components/admin/AvailabilityCalendar.tsx` (229 líneas)
- ✅ `app/admin/disponibilidad/page.tsx` (199 líneas)
- ✅ `scripts/add-specialist-availability.sql` (204 líneas)
- ✅ `types/specialist.ts` (actualizado)
- ✅ `INSTRUCCIONES_DISPONIBILIDAD.md` (guía completa)

**Estado:** ✅ **COMPLETADO (80%)** - Funcionalidad core lista para producción. Pendiente: gestión de bloqueos específicos (días festivos/vacaciones).

---

#### 2. Cálculo de Horarios Disponibles (Booking Real)
**Problema actual:** La página de reserva no muestra slots reales disponibles
**Impacto:** No se pueden hacer reservas funcionales

**Tasks:**
- [ ] **2.1** Función: Calcular slots disponibles
  - Input: `businessId`, `specialtyId`, `date`
  - Cruzar: disponibilidad de especialistas + reservas existentes + horarios del negocio
  - Output: Array de `{ time: '09:00', specialistId: 'xxx', available: true }`
  
- [ ] **2.2** Componente: Selector de horarios
  - Grid visual de horarios disponibles
  - Mostrar nombre del especialista
  - Marcar slots ocupados/disponibles
  - Seleccionar slot deseado
  
- [ ] **2.3** Actualizar: `/[slug]/reservar`
  - Reemplazar selector de hora manual por slots reales
  - Validar que el slot siga disponible antes de confirmar
  - Bloquear slot temporalmente durante confirmación (evitar doble booking)

**Tiempo estimado:** 2 días  
**Archivos a modificar:**
- `app/[slug]/reservar/page.tsx`
- `lib/services/appointments.ts` (nuevo: `getAvailableSlots()`)
- `components/reservas/TimeslotPicker.tsx` (nuevo)

---

### 🟠 IMPORTANTE - Semana 2 (5 días)

#### 3. Validación Zod en Formularios Restantes
**Problema actual:** Solo login y registro tienen validación Zod
**Impacto:** Inconsistencia y posibles errores de datos

**Tasks:**
- [ ] **3.1** Aplicar schemas existentes:
  - `especialidadSchema` → `/admin/especialidades/page.tsx`
  - `especialistaSchema` → `/admin/especialistas/page.tsx`
  - `reservaSchema` → `/[slug]/reservar/page.tsx`
  - `businessConfigSchema` → `/admin/configuracion/page.tsx`
  - `tenantUserSchema` → `/admin/usuarios/page.tsx`
  
- [ ] **3.2** Crear schemas faltantes:
  - `perfilSchema` → `/perfil/page.tsx`
  - `cambioPasswordSchema` → Cambio de contraseña
  - `notasReservaSchema` → Notas del especialista en reservas

**Tiempo estimado:** 2 días  
**Archivos a modificar:** ~8 páginas

---

#### 4. Sistema de Reviews y Calificaciones
**Problema actual:** No hay feedback de clientes
**Impacto:** Sin reputación ni confianza del sistema

**Tasks:**
- [ ] **4.1** Base de datos:
  ```sql
  CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES businesses(id),
    appointment_id UUID REFERENCES appointments(id),
    user_id UUID REFERENCES profiles(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    response TEXT, -- Respuesta del negocio
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
  
- [ ] **4.2** Componente: Formulario de review
  - Estrellas (1-5)
  - Comentario opcional
  - Mostrar solo si reserva está completada
  - Enviar notificación al negocio
  
- [ ] **4.3** Mostrar reviews:
  - En página de detalle del negocio `/[slug]`
  - Promedio de calificación
  - Últimos 5 reviews
  - Respuestas del negocio (opcional)
  
- [ ] **4.4** Panel admin: Gestionar reviews
  - Ver todas las reviews
  - Responder a reviews
  - Reportar reviews inapropiadas

**Tiempo estimado:** 3 días  
**Archivos a crear:**
- `scripts/add-reviews-table.sql`
- `components/reviews/ReviewForm.tsx`
- `components/reviews/ReviewList.tsx`
- `app/admin/reviews/page.tsx`
- `lib/services/reviews.ts`

---

### 🟡 MEDIO - Semana 3 (5 días)

#### 5. Analytics y Reportes Avanzados
**Problema actual:** Dashboard básico, sin insights valiosos
**Impacto:** Difícil tomar decisiones basadas en datos

**Tasks:**
- [ ] **5.1** Métricas adicionales en dashboard:
  - Tasa de ocupación (% slots ocupados vs disponibles)
  - Ingresos estimados (si hay precios configurados)
  - Clientes nuevos vs recurrentes
  - Especialistas más solicitados
  - Horarios más demandados
  
- [ ] **5.2** Gráficas visuales:
  - Reservas por día/semana/mes (línea)
  - Distribución por especialidad (pie chart)
  - Tendencia de crecimiento
  - Usar librería: `recharts` o `chart.js`
  
- [ ] **5.3** Exportar reportes:
  - Excel: Listado de reservas por período
  - PDF: Reporte mensual
  - CSV: Datos raw para análisis externo

**Tiempo estimado:** 3 días  
**Archivos a modificar:**
- `app/admin/dashboard/page.tsx`
- Nuevos: `components/admin/Charts.tsx`, `lib/utils/exportData.ts`

---

#### 6. Notificaciones Email
**Problema actual:** No hay confirmaciones automáticas
**Impacto:** Usuarios no reciben recordatorios

**Tasks:**
- [ ] **6.1** Configurar Email (Resend o SendGrid):
  - Crear cuenta en Resend.com (gratis 100emails/día)
  - Configurar API key en `.env`
  - Template básico de email
  
- [ ] **6.2** Emails transaccionales:
  - Confirmación de reserva (cliente + negocio)
  - Recordatorio 24h antes de la cita
  - Solicitud de review post-cita
  - Aprobación de negocio (super admin)
  
- [ ] **6.3** Edge function o API Route:
  - `/api/send-email` endpoint
  - Validar request, evitar spam
  - Queue de emails (opcional: Inngest/Trigger.dev)

**Tiempo estimado:** 2 días  
**Dependencias:** `npm install resend`  
**Archivos a crear:**
- `app/api/send-email/route.ts`
- `lib/email/templates.ts`
- `lib/email/sendEmail.ts`

---

## 📈 Progreso

```
FASE 2 Progress: 0/6 completado

🔴 CRÍTICO (Semana 1):
  [ ] 1. Calendario de disponibilidad
  [ ] 2. Cálculo de horarios reales

🟠 IMPORTANTE (Semana 2):
  [ ] 3. Validación Zod completa
  [ ] 4. Sistema de reviews

🟡 MEDIO (Semana 3):
  [ ] 5. Analytics avanzado
  [ ] 6. Notificaciones email
```

---

## 🛠️ Tecnologías a Agregar

```json
{
  "recharts": "^2.x", // Gráficas
  "resend": "^3.x",   // Emails transaccionales
  "date-fns-tz": "^3.x", // Manejo de zonas horarias
  "@tanstack/react-query": "^5.x" // Cache y estado (opcional)
}
```

---

## 🎯 Criterios de Éxito

Al finalizar FASE 2, el sistema debe:

- ✅ Permitir a especialistas configurar su disponibilidad semanal
- ✅ Mostrar solo horarios realmente disponibles al cliente
- ✅ Prevenir double-booking automáticamente
- ✅ Validar todos los formularios con Zod (consistencia)
- ✅ Permitir a clientes dejar reviews
- ✅ Enviar emails de confirmación automáticos
- ✅ Mostrar métricas valiosas en dashboard

---

## 📝 Notas

- **Prioridad flexible:** Si alguna tarea se complica, mover a FASE 3
- **Testing:** Escribir tests para funciones críticas (slots disponibles)
- **Performance:** Cachear cálculo de slots (react-query o SWR)
- **UX:** Loading states en todas las operaciones asíncronas

---

**Siguiente:** FASE 3 - Optimización y Escalabilidad
