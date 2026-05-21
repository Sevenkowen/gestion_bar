# Despliegue en Raspberry Pi (demo / feedback cliente)

Guía para correr **SistemaBar completo** en una Raspberry Pi en tu red WiFi, sin pagar hosting. Los celulares y notebooks de la misma red acceden por `http://IP-DE-LA-PI`.

## Qué se levanta

| Servicio      | Puerto | Descripción                          |
|---------------|--------|--------------------------------------|
| **web**       | 80     | PWA (mozos, caja, admin) + nginx    |
| **api**       | —      | NestJS (solo red interna Docker)     |
| **postgres**  | —      | Base de datos                        |
| **print-worker** | —   | Cola de impresión (opcional)         |

Todo va por **un solo puerto (80)**: la app llama a `/api/...` y WebSocket por el mismo host.

## Requisitos

- **Raspberry Pi 4** (recomendado 2 GB RAM o más) con **Raspberry Pi OS 64-bit**
- SSD o SD de al menos **16 GB** (SSD mucho mejor)
- Pi y clientes en la **misma red WiFi**
- [Docker](https://docs.docker.com/engine/install/debian/) + Docker Compose plugin instalados en la Pi

## 1. Instalar Docker en la Pi

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar para que aplique el grupo docker
docker compose version
```

## 2. Copiar el proyecto a la Pi

**Opción A — Git (recomendado)**

```bash
cd ~
git clone <URL-DE-TU-REPO> SistemaBar
cd SistemaBar
```

**Opción B — Desde tu PC (Windows)**

Copiá la carpeta `SistemaBar` a la Pi con WinSCP, FileZilla o:

```powershell
scp -r E:\SistemaBar pi@192.168.1.50:~/
```

## 3. Configurar variables de entorno

```bash
cd ~/SistemaBar
cp .env.prod.example .env
nano .env
```

Editá al menos:

```env
JWT_SECRET=una-clave-larga-y-aleatoria-de-al-menos-32-caracteres
CORS_ORIGINS=http://192.168.1.50
WEB_PORT=80
```

- **`192.168.1.50`** → IP local de tu Pi (`hostname -I` en la Pi).
- Si usás `raspberrypi.local`, podés agregar:  
  `CORS_ORIGINS=http://192.168.1.50,http://raspberrypi.local`

## 4. Levantar el sistema

```bash
# network: host en el compose ayuda a npm dentro del build en la Pi
DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml up -d --build
```

Si falla `npm ci` por red, probá **una imagen a la vez**:

```bash
DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml build api
DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml build web
DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml up -d
```

La **primera vez** tarda **20–40 minutos** en la Pi (compila backend + frontend). Las siguientes son más rápidas.

Verificá que todo esté arriba:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

## 5. Cargar datos de demo

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma db seed
```

Usuarios de prueba:

| Usuario | Clave    | Rol   |
|---------|----------|-------|
| admin   | admin123 | Admin |
| mozo1   | mozo123  | Mozo  |
| caja1   | caja123  | Caja  |

## 6. Acceder desde celular / notebook

1. Conectate a la **misma WiFi** que la Pi.
2. Abrí el navegador: **`http://192.168.1.50`** (tu IP).
3. Login con `mozo1` / `mozo123` para la vista mozos, o `admin` / `admin123` para admin.

### Instalar como app (PWA)

En Chrome/Android: menú → **“Agregar a pantalla de inicio”**.  
En iPhone/Safari: Compartir → **“Agregar a inicio”**.

## Comandos útiles

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Reiniciar
docker compose -f docker-compose.prod.yml restart

# Parar todo
docker compose -f docker-compose.prod.yml down

# Parar y borrar base de datos (¡cuidado!)
docker compose -f docker-compose.prod.yml down -v

# Actualizar después de un git pull
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

## Impresoras

El **print-worker** corre pero las impresoras demo tienen IP ficticia. Para demo con el cliente **no hace falta** impresora real; los pedidos funcionan igual.

Si no querés el worker:

```bash
docker compose -f docker-compose.prod.yml stop print-worker
```

## IP fija (recomendado para demo)

En el router, reservá DHCP para la MAC de la Pi así la IP no cambia entre reinicios.

## Solución de problemas

| Problema | Qué hacer |
|----------|-----------|
| No carga la web | `docker compose -f docker-compose.prod.yml ps` — ¿`web` está Up? |
| Login falla / 401 | Revisá `JWT_SECRET` en `.env` y reiniciá: `docker compose ... restart api web` |
| Error CORS | `CORS_ORIGINS` debe coincidir con la URL que usás (con `http://`, sin `/` final) |
| Build muy lento | Normal en Pi; dejá correr. Usá SSD. |
| **`npm ci` / network error** en build | Ver sección abajo |
| Sin memoria | Pi 4 2GB alcanza; cerrá otras apps. Podés parar `print-worker`. |
| API docs | Solo en red interna: `docker compose exec api wget -qO- http://localhost:3000/api/docs` |

## Error `npm ci` / network durante el build

Dentro de Docker la Pi a veces no llega a `registry.npmjs.org`. Probá en orden:

**1. Verificar internet en la Pi (fuera de Docker):**
```bash
ping -c 3 registry.npmjs.org
curl -I https://registry.npmjs.org
```

**2. Actualizar el repo** (incluye Dockerfiles con reintentos y `network: host`):
```bash
cd ~/gestion_bar
git pull
```

**3. Rebuild limpio:**
```bash
DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml build --no-cache api
DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml build --no-cache web
docker compose -f docker-compose.prod.yml up -d
```

**4. DNS en Docker** (si sigue fallando), editá `/etc/docker/daemon.json`:
```json
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
```
```bash
sudo systemctl restart docker
```

**5. Alternativa:** build en tu PC con Docker Buildx para ARM y exportar imágenes (solo si nada más funciona).

## Seguridad (demo en casa)

- Esto es para **red local / feedback**, no para internet público.
- Cambiá las contraseñas demo antes de mostrar a un cliente real.
- No expongas el puerto 80 al modem sin firewall/VPN.

## Desarrollo en PC vs producción en Pi

| Entorno | Comando |
|---------|---------|
| **PC (dev)** | `docker compose up postgres -d` + backend/frontend nativos |
| **Pi (demo)** | `docker compose -f docker-compose.prod.yml up -d --build` |

En la Pi **no hace falta** Node instalado: todo corre en Docker.
