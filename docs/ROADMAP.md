# Roadmap MVP — SistemaBar

## Fase 1 — MVP funcional (8-10 semanas estimadas)

### Sprint 1: Fundación (semana 1-2)
- [x] Diseño arquitectura + schema Prisma
- [ ] Docker Compose (PostgreSQL + API + Nginx)
- [ ] NestJS bootstrap: config, Prisma, health, Swagger
- [ ] Quasar PWA bootstrap: layout, router, Pinia, axios
- [ ] Auth: login JWT, guards, roles (admin/caja/mozo)
- [ ] Seed: usuario admin, categorías, mesas demo

### Sprint 2: Catálogo admin (semana 3-4)
- [ ] CRUD Categorías
- [ ] CRUD Ingredientes + stock inicial
- [ ] CRUD Productos con receta visual
- [ ] CRUD Combos con selector de productos
- [ ] Upload imágenes (local filesystem / volume Docker)
- [ ] Disponibilidad automática (recalcular al cambiar stock)

### Sprint 3: Operación mozos (semana 5-6)
- [ ] CRUD Mesas + estados
- [ ] Abrir mesa / crear pedido
- [ ] Agregar productos y combos al pedido
- [ ] Modificar cantidades (borrador)
- [ ] Enviar pedido → eventos stock + impresión
- [ ] Pedir cuenta
- [ ] Socket.IO: mesas y pedidos en tiempo real
- [ ] PWA mozos: UI táctil, offline assets

### Sprint 4: Impresión + Cocina (semana 7)
- [ ] PrintJob queue en DB
- [ ] Print worker con node-escpos
- [ ] Config impresoras (admin)
- [ ] Tickets cocina y barra
- [ ] Reintentos y estado ERROR
- [ ] Prueba con impresora térmica real en red

### Sprint 5: Caja (semana 8)
- [ ] Vista mesas pendientes de cobro
- [ ] Cobro: efectivo, tarjeta, transferencia, mixto
- [ ] Cierre mesa
- [ ] Historial ventas del día
- [ ] Reimprimir ticket cliente
- [ ] PWA caja

### Sprint 6: Pulido producción (semana 9-10)
- [ ] AuditLog acciones admin
- [ ] Logs estructurados (pino)
- [ ] Validaciones y manejo errores global
- [ ] Tests e2e críticos (pedido → stock → print)
- [ ] Documentación despliegue Raspberry Pi
- [ ] Backup script PostgreSQL
- [ ] UAT en local real

---

## Fase 2 — Operación ampliada (post-MVP)

| Feature | Prioridad | Dependencias |
|---------|-----------|--------------|
| Pedidos QR por mesa | Alta | Auth pública mesa, PWA cliente |
| Descuentos / promociones | Media | Módulo caja |
| Turnos / arqueo de caja | Alta | Módulo caja |
| Reportes básicos (ventas, productos top) | Media | — |
| Múltiples impresoras por sector | Media | Ya modelado |
| Anulaciones con permiso admin | Alta | AuditLog |

---

## Fase 3 — Multi-sucursal y delivery

| Feature | Notas |
|---------|-------|
| Multi-sucursal | Activar `branchId` en UI y filtros |
| Delivery | `OrderType.DELIVERY`, dirección, cadete |
| App móvil | Capacitor sobre Quasar o React Native |
| Cloud sync | Outbox pattern, sync nocturno |
| MercadoPago | Módulo pagos online |
| AFIP facturación | Módulo fiscal Argentina |

---

## Criterios de "MVP listo"

1. Mozo puede tomar pedido completo en mesa y enviarlo a cocina impreso.
2. Bebidas van a barra, comida a cocina — nunca mezcladas incorrectamente.
3. Stock de ingredientes se descuenta al enviar pedido.
4. Producto sin stock queda no disponible automáticamente.
5. Caja cobra y cierra mesa con historial del día.
6. Admin gestiona carta, combos, ingredientes y usuarios.
7. Sistema corre 8+ horas en Raspberry Pi sin caídas.
8. Funciona sin internet en red local.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Impresora USB en Pi | Preferir impresoras de red; driver ESC/POS over TCP |
| Pérdida de pedidos | PrintJob persistido; Order nunca se borra |
| SD card corruption | SSD obligatorio; PostgreSQL en volume |
| Conflictos concurrentes en mesa | Optimistic locking en Order (`version` field) |
| PWA cache stale | Estrategia network-first para API calls |
