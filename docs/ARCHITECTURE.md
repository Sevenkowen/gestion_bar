# Arquitectura — SistemaBar

## Visión general

Monolito modular desplegado en red local (Raspberry Pi 4 + SSD). Un solo backend NestJS expone REST + WebSockets; múltiples PWAs (mozos, caja, admin) consumen la misma API.

```
┌─────────────────────────────────────────────────────────────────┐
│                     RED LOCAL (sin internet)                     │
├─────────────────────────────────────────────────────────────────┤
│  PWA Mozos    PWA Caja    PWA Admin                             │
│      │            │            │                               │
│      └────────────┴────────────┘                               │
│                   │ HTTP REST + Socket.IO                       │
│         ┌─────────▼─────────┐                                   │
│         │   NestJS API      │                                   │
│         │  (monolito mod.)  │                                   │
│         ├───────────────────┤                                   │
│         │ Auth │ Mesas │ Pedidos │ Productos │ Stock │ Caja   │
│         │ Combos │ Admin │ Impresión │ Usuarios │ Events     │
│         └─────────┬─────────┘                                   │
│                   │                                             │
│    ┌──────────────┼──────────────┐                              │
│    ▼              ▼              ▼                              │
│ PostgreSQL   Print Worker    Impresoras ESC/POS                 │
│ (Docker)     (node-escpos)   (cocina / barra)                   │
└─────────────────────────────────────────────────────────────────┘
```

## Principios

| Principio | Implementación |
|-----------|----------------|
| Lógica en backend | Validaciones, stock, impresión, permisos — todo en NestJS |
| Modularidad | Un módulo NestJS por dominio; interfaces claras entre módulos |
| Eventos internos | `@nestjs/event-emitter` para desacoplar pedidos → stock → impresión |
| Tiempo real | Gateway Socket.IO por sala (`branch:{id}`, `table:{id}`, `role:{role}`) |
| Multi-sucursal ready | `branchId` en entidades clave desde el MVP |
| Offline-first PWA | Service Worker cachea assets; API requiere red local |

## Módulos del backend

```
backend/src/
├── modules/
│   ├── auth/           # JWT, login, guards, roles
│   ├── users/          # CRUD usuarios, asignación roles
│   ├── mesas/          # Mesas, estados, layout
│   ├── pedidos/        # Órdenes, ítems, envío a cocina
│   ├── productos/      # Productos, categorías, recetas
│   ├── combos/         # Combos y productos internos
│   ├── stock/          # Ingredientes, movimientos, disponibilidad
│   ├── caja/           # Cobros, cierre mesa, historial
│   ├── impresion/      # Cola, worker ESC/POS, reintentos
│   ├── admin/          # Configuración, dashboard básico
│   └── events/         # Gateway Socket.IO
├── common/             # Guards, filters, interceptors, DTOs base
├── config/             # ConfigModule + validación env
└── prisma/             # PrismaService global
```

### Dependencias entre módulos

```
auth ──► todos (guard global excepto login/health)
pedidos ──► productos, combos, stock, impresion, events
stock ──► productos (disponibilidad automática)
caja ──► pedidos, mesas, events
impresion ──► pedidos (solo lectura + PrintJob)
admin ──► productos, combos, stock, users, mesas
```

**Regla:** los módulos se comunican vía **servicios exportados** o **eventos de dominio**, nunca importando controllers entre sí.

## Eventos de dominio (EventEmitter)

| Evento | Emisor | Suscriptores |
|--------|--------|--------------|
| `order.items.sent` | pedidos | stock, impresion, events |
| `stock.movement.created` | stock | productos (recalcular disponibilidad) |
| `product.availability.changed` | productos | events (broadcast) |
| `table.status.changed` | mesas/pedidos/caja | events |
| `payment.completed` | caja | pedidos, mesas, events |
| `print.job.failed` | impresion | admin (alerta), events |

## API REST — convenciones

- Prefijo: `/api/v1`
- Autenticación: `Authorization: Bearer <JWT>`
- Respuestas de error estándar:

```json
{
  "statusCode": 400,
  "message": "Descripción legible",
  "error": "Bad Request",
  "timestamp": "2026-05-20T12:00:00.000Z",
  "path": "/api/v1/pedidos/1/enviar"
}
```

- Paginación: `?page=1&limit=20`
- Filtros por query params documentados en Swagger (`/api/docs`)

## WebSockets (Socket.IO)

### Salas

| Sala | Quién se une | Propósito |
|------|--------------|-----------|
| `branch:{branchId}` | Todos los clientes autenticados | Broadcast general |
| `role:{role}` | Por rol del JWT | Caja solo ve eventos de caja |
| `table:{tableId}` | Mozo en mesa específica | Detalle de pedido |

### Eventos emitidos (servidor → cliente)

| Evento | Payload | Destinatarios |
|--------|---------|---------------|
| `mesa:updated` | `{ id, status, orderId, waiterId }` | branch |
| `pedido:updated` | `{ orderId, items, status }` | table + branch |
| `pedido:nuevo` | `{ orderId, tableId, items[] }` | branch (cocina vía impresión) |
| `producto:disponibilidad` | `{ productId, available }` | branch |
| `caja:mesa-cobrada` | `{ tableId, paymentId }` | branch |

### Autenticación WS

El cliente envía el JWT en `auth.token` al conectar. El gateway valida y asigna salas.

## Seguridad (MVP)

- Contraseñas: `bcrypt` (cost 12)
- JWT access token (15 min) + refresh token (7 días) en httpOnly cookie o body
- Rate limiting en login (`@nestjs/throttler`)
- Helmet + CORS restringido a IPs/hostnames del local
- Validación DTO con `class-validator`
- RBAC por módulo: `@Roles('admin', 'mozo')`

## Escalabilidad futura

| Feature futuro | Preparación en MVP |
|----------------|-------------------|
| Pedidos QR | `Order.source` enum + `externalRef`; módulo `pedidos-qr` |
| App móvil / delivery | Misma API REST; `Order.type` = SALON \| DELIVERY \| TAKEAWAY |
| Multi-sucursal | `branchId` en todas las entidades operativas |
| Cloud sync | Tabla `SyncOutbox` + worker opcional (no MVP) |
| Múltiples impresoras | `Printer` por sector + cola por `printerId` |
| MercadoPago / AFIP | Módulos `pagos-externos`, `facturacion` aislados |

## Despliegue Raspberry Pi

```yaml
# docker-compose.prod.yml
services:
  postgres:    # datos en volumen SSD
  api:         # NestJS, restart always
  print-worker: # mismo image, CMD dist/worker/print.worker.js
  nginx:       # reverse proxy + servir PWA estática
```

- Health checks en `/api/v1/health`
- Logs JSON a stdout (Docker logs)
- Backups PostgreSQL con cron en el host

## Stack de observabilidad (MVP mínimo)

- `nestjs-pino` — logs estructurados
- `AuditLog` en DB — acciones admin sensibles
- Métricas básicas: contador pedidos/día en admin dashboard
