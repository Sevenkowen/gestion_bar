# SistemaBar

Sistema de gestión para bar/restaurante — mozos, caja, admin, menú, stock e impresión.

## Stack

- **Backend:** NestJS, Prisma, PostgreSQL, Socket.IO
- **Frontend:** Vue 3, Quasar PWA
- **Deploy:** Docker Compose (dev + producción Raspberry Pi)

## Inicio rápido (desarrollo)

```bash
docker compose up postgres -d
cd backend && npm install && npm run start:dev
cd frontend && npm install && npm run dev
```

Login demo: `admin` / `admin123`, `mozo1` / `mozo123`, `caja1` / `caja123`

## Despliegue Raspberry Pi

Ver [docs/DEPLOY-RPI.md](docs/DEPLOY-RPI.md)

## Documentación

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/FLOWS.md](docs/FLOWS.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
