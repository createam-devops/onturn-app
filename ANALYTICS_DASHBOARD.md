# Analytics Dashboard - Documentación

## 📊 Overview

El Analytics Dashboard proporciona métricas completas y visualizaciones para ayudar a los dueños de negocios a tomar decisiones informadas basadas en datos.

## 🎯 Características Principales

### 1. KPI Cards (Tarjetas de Métricas Clave)

**Métricas principales:**
- **Total de Citas**: Número total de reservas con trend vs mes anterior
- **Ingresos Estimados**: Cálculo basado en citas completadas × precio promedio
- **Tasa de Ocupación**: Porcentaje de slots reservados
- **Calificación Promedio**: Rating general del negocio

**Métricas secundarias:**
- Clientes Nuevos (primera visita)
- Clientes Recurrentes (más de una visita)
- Citas Canceladas

### 2. Gráficos de Tendencia

#### **Tendencia de Citas (Línea)**
- Muestra evolución de citas e ingresos en los últimos N días
- Dos líneas: Citas (azul) y Revenue (verde)
- Permite identificar patrones y estacionalidad

#### **Distribución Horaria (Barras)**
- Muestra qué horas del día tienen más reservas
- Rango: 8:00 - 20:00
- Hora pico destacada en verde
- Útil para optimizar horarios del personal

#### **Distribución por Especialidad (Pastel)**
- Porcentaje de popularidad de cada servicio
- Máximo 6 especialidades con colores únicos
- Ayuda a identificar servicios más demandados

### 3. Tabla de Rendimiento de Especialistas

Ranking de especialistas por:
- Total de citas
- Citas completadas (con % de completitud)
- Rating promedio
- Ingresos generados

El top performer aparece destacado con:
- Fondo azul claro
- Ícono de trending up

### 4. Resumen de Estados

Desglose de citas por estado:
- Completadas (verde)
- Pendientes (azul)
- Canceladas (rojo)

### 5. Tasa de Retención

Porcentaje de clientes que regresan:
```
Retención % = (Clientes Recurrentes / Total Clientes) × 100
```

### 6. Comparación Mensual

Compara citas del mes actual vs mes anterior:
- Número de citas en cada período
- Porcentaje de cambio
- Tendencia (↑ verde o ↓ rojo)

## 🔧 Funcionalidades

### Selector de Rango de Fechas

Permite filtrar datos por período:
- **7 días**: Vista semanal reciente
- **30 días**: Vista mensual (por defecto)
- **90 días**: Vista trimestral
- **1 año**: Vista anual

**Cambiar período:**
1. Click en el botón del período deseado
2. Los datos se recargan automáticamente
3. Todos los gráficos se actualizan

### Botón Actualizar

- Icono: ↻ RefreshCw
- Función: Recarga manualmente todos los datos
- Útil después de cambios en citas/especialistas

### Botón Exportar

- Icono: ⬇️ Download
- Función: Exportar reporte (futuro: PDF/Excel)
- Estado: Preparado para implementación

## 📈 Cálculos y Métricas

### Tasa de Ocupación
```typescript
occupancyRate = (citasCompletadas + citasConfirmadas) / totalCitas × 100
```

### Ingresos Estimados
```typescript
totalRevenue = citasCompletadas × precioPromedio
```
*Actualmente usa $50 como precio promedio por defecto*

### Rating Promedio
```typescript
averageRating = SUM(ratings visibles) / COUNT(reviews visibles)
```

### Tasa de Retención
```typescript
retentionRate = clientesRecurrentes / (nuevos + recurrentes) × 100
```

### Cambio Mensual
```typescript
change = ((mesActual - mesAnterior) / mesAnterior) × 100
```

## 🎨 Diseño y UX

### Paleta de Colores

**KPI Cards:**
- Azul: Citas, clientes establecidos
- Verde: Ingresos, completadas
- Púrpura: Ocupación
- Naranja: Rating, canceladas
- Teal: Clientes nuevos

**Gráficos:**
- Líneas: Azul (#3b82f6), Verde (#10b981)
- Barras: Gradiente azul, pico en verde
- Pastel: Paleta de 6 colores

### Estados de Carga

- Spinner centrado mientras carga
- Mensaje: "Cargando analytics..."
- Skeleton screens (futuro)

### Responsive Design

- Desktop: Grid 4 columnas (KPIs), 2 columnas (gráficos)
- Tablet: Grid 2 columnas
- Mobile: Columna única

## 🔒 Seguridad y Permisos

### Auth Guards

1. **No autenticado**: Redirect → `/login`
2. **No business owner**: Redirect → `/admin/dashboard`
3. **Sin negocio**: Muestra mensaje de error

### Políticas RLS

Todas las consultas filtran por:
```sql
business_id IN (
  SELECT id FROM businesses 
  WHERE owner_id = auth.uid()
)
```

## 🚀 Próximas Mejoras

### Corto Plazo
- [ ] Exportar a PDF/Excel
- [ ] Comparación con períodos anteriores
- [ ] Filtros adicionales (por especialidad, especialista)

### Mediano Plazo
- [ ] Predicción de demanda con ML
- [ ] Alertas automáticas (baja ocupación, reviews negativas)
- [ ] Benchmarking vs competencia

### Largo Plazo
- [ ] Dashboard personalizable (widgets arrastrables)
- [ ] Reportes programados por email
- [ ] Integración con sistemas de pago (revenue real)

## 📝 Notas Técnicas

### Performance

**Optimizaciones implementadas:**
- Carga paralela de métricas (Promise.all)
- Consultas optimizadas con índices
- Lazy loading de gráficos
- Memoización de cálculos

**Tiempos esperados:**
- Carga inicial: < 2 segundos
- Cambio de período: < 1 segundo
- Refresh manual: < 1.5 segundos

### Dependencias

```json
{
  "recharts": "^3.7.0",
  "date-fns": "^latest"
}
```

### Estructura de Archivos

```
lib/services/
  └── analytics.ts (service layer)

components/analytics/
  ├── MetricCard.tsx
  ├── AppointmentsTrendChart.tsx
  ├── HourlyDistributionChart.tsx
  ├── SpecialtyDistributionChart.tsx
  ├── SpecialistPerformanceTable.tsx
  └── DateRangeSelect.tsx

app/admin/analytics/
  └── page.tsx (main dashboard)
```

## 🐛 Troubleshooting

### "No hay datos disponibles"
- Verificar que el negocio tenga citas creadas
- Confirmar que el rango de fechas contiene datos
- Revisar logs de consola para errores de API

### Gráficos no se renderizan
- Verificar que recharts esté instalado correctamente
- Limpiar caché de Next.js: `rm -rf .next`
- Verificar versión de React compatible

### Datos incorrectos
- Verificar políticas RLS en Supabase
- Confirmar que business_id está correctamente filtrado
- Revisar cálculos en analytics.ts

## 📞 Soporte

Para reportar bugs o solicitar features:
1. Revisar logs de consola
2. Documentar pasos para reproducir
3. Incluir screenshots si aplica
4. Contactar al equipo de desarrollo
