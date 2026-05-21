# Buenas prácticas — SistemaBar

## Backend (NestJS)

### Estructura por módulo

```
modules/pedidos/
├── pedidos.module.ts
├── pedidos.controller.ts
├── pedidos.service.ts
├── dto/
│   ├── create-order-item.dto.ts
│   └── send-order.dto.ts
├── events/
│   └── order-items-sent.handler.ts
└── pedidos.service.spec.ts
```

### Convenciones

- **DTOs** con `class-validator` en cada endpoint; nunca confiar en el frontend.
- **Servicios** contienen lógica de negocio; controllers solo orquestan HTTP.
- **Transacciones Prisma** para operaciones multi-tabla:

```typescript
await this.prisma.$transaction(async (tx) => {
  await tx.orderItem.updateMany(/* ... */);
  await this.stockService.deductForOrder(orderId, tx);
});
```

- **Eventos** para efectos secundarios (stock, print, WS) — no llamadas directas encadenadas en el controller.
- **Errores de dominio** con excepciones NestJS:

```typescript
throw new UnprocessableEntityException('No hay stock suficiente de Pan');
throw new ConflictException('La mesa ya tiene una orden activa');
```

### Naming

| Concepto | Español dominio | Código |
|----------|-----------------|--------|
| Mesa | mesa | `Table` |
| Pedido | pedido | `Order` |
| Producto | producto | `Product` |
| Ingrediente | ingrediente | `Ingredient` |

Usar español en mensajes al usuario; inglés en código (convención NestJS/Prisma).

### Logs

```typescript
this.logger.log({ orderId, tableId, action: 'order.sent' }, 'Pedido enviado');
this.logger.error({ err, printJobId }, 'Error de impresión');
```

### Seguridad

- Nunca loguear contraseñas ni tokens completos.
- Sanitizar inputs de búsqueda (Prisma parametriza automáticamente).
- `@Roles()` en cada endpoint según matriz de permisos.
- Rate limit: 5 intentos login / minuto por IP.

---

## Frontend (Quasar + Vue 3)

### Estructura

```
frontend/src/
├── apps/
│   ├── mozos/          # Rutas y layouts mozos
│   ├── caja/
│   └── admin/
├── shared/
│   ├── components/
│   ├── composables/
│   ├── services/       # API clients
│   └── stores/         # Pinia
├── boot/
│   ├── axios.ts
│   └── socket.ts
└── router/
```

### Convenciones

- **Composition API** + `<script setup>` siempre.
- **Pinia stores** por dominio: `useMesasStore`, `usePedidoStore`.
- **Composables** para lógica reutilizable: `useSocket`, `useAuth`.
- **API service layer** — componentes no llaman axios directamente:

```typescript
// services/pedidos.api.ts
export const pedidosApi = {
  enviar: (orderId: number) => api.post(`/pedidos/${orderId}/enviar`),
};
```

- **Optimistic UI** solo para acciones reversibles; enviar pedido espera confirmación server.
- **Quasar Notify** para feedback de errores API.

### PWA

- `network-first` para `/api/*`
- `cache-first` para assets estáticos
- Indicador visual de conexión perdida
- Instalable en home screen (mozos/caja con tablets)

---

## Base de datos

- Migraciones Prisma versionadas — nunca editar DB manualmente en prod.
- Índices en: `Order.tableId + status`, `PrintJob.status`, `StockMovement.ingredientId + createdAt`.
- Soft delete en productos/combos (`deletedAt`) — no borrar datos referenciados en pedidos históricos.
- `Decimal` para precios y costos — nunca `Float`.

---

## Docker / Raspberry Pi

- Imágenes multi-stage (build → slim runtime).
- Variables sensibles en `.env` — nunca en imagen.
- `restart: unless-stopped` en todos los servicios.
- Límites de memoria: API 512M, PostgreSQL 256M (ajustar según Pi).
- Healthcheck en API y Postgres antes de arrancar print-worker.

---

## Testing (MVP mínimo)

| Área | Tipo | Qué testear |
|------|------|-------------|
| Stock | Unit | Descuento receta, combo expansion |
| Pedidos | Integration | Enviar → stock + print jobs |
| Auth | E2E | Login, rutas protegidas |
| Disponibilidad | Unit | Sin pan → hamburguesa unavailable |

---

## Git / CI (recomendado)

- Conventional commits: `feat(pedidos): enviar items a cocina`
- Branch: `main` (prod) / `develop` (integración)
- Pre-commit: lint + prisma validate
- CI: `npm test` + `docker compose build` en push

---

## Matriz de permisos MVP

| Módulo | admin | caja | mozo |
|--------|:-----:|:----:|:----:|
| auth/login | ✓ | ✓ | ✓ |
| mesas (ver) | ✓ | ✓ | ✓ |
| mesas (abrir) | ✓ | — | ✓ |
| pedidos (crear/editar) | ✓ | — | ✓ |
| pedidos (enviar) | ✓ | — | ✓ |
| caja (cobrar) | ✓ | ✓ | — |
| productos/combos CRUD | ✓ | — | — |
| ingredientes/stock | ✓ | — | — |
| usuarios CRUD | ✓ | — | — |
| impresoras config | ✓ | — | — |
| historial ventas | ✓ | ✓ | — |
