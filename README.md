# PEDIACORE

**Plataforma integral para consultorios pediátricos independientes.**

Aplicación web full stack diseñada para digitalizar y optimizar la gestión de consultorios pediátricos en Chile. Desarrollada como Proyecto Final del Máster en Desarrollo Full Stack de ConquerBlocks, y actualmente en uso real por la Dra. Estefanía Ortigosa en sus consultorios de Pucón y Villarrica.

**Producción:** [estefipediatra.com](https://estefipediatra.com)

---

## Tabla de contenidos

- [Problema y contexto](#problema-y-contexto)
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Funcionalidades](#funcionalidades)
- [Roles de usuario](#roles-de-usuario)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Instalación y configuración](#instalación-y-configuración)
- [Variables de entorno](#variables-de-entorno)
- [Ejecución en desarrollo](#ejecución-en-desarrollo)
- [Testing](#testing)
- [Despliegue en producción](#despliegue-en-producción)
- [Seguridad](#seguridad)
- [Métricas del proyecto](#métricas-del-proyecto)

---

## Problema y contexto

Los consultorios pediátricos independientes en Chile operan con herramientas desconectadas: agendas en papel, WhatsApp para coordinar pacientes, fichas clínicas en planillas, y pagos sin trazabilidad. La Dra. Estefanía Ortigosa atiende en dos sedes (Pucón y Villarrica) y necesitaba una solución unificada que digitalizara todo el flujo: desde la reserva online hasta la historia clínica con curvas de crecimiento OMS.

**PEDIACORE** resuelve esto con una plataforma que integra:
- Reserva online con pago integrado (MercadoPago)
- Historia clínica pediátrica estructurada (SOAP + antropometría OMS)
- Portal para padres con acceso a turnos, datos de sus hijos y notificaciones
- Panel administrativo completo para la doctora
- Despliegue productivo con dominio propio y HTTPS

---

## Tecnologías

### Backend

| Tecnología | Versión | Justificación |
|------------|---------|---------------|
| **Python** | 3.12 | Última estable, type hints completos |
| **Django** | 5.2 | Framework maduro con ORM robusto, admin extensible, ecosystem rico |
| **Django REST Framework** | 3.16 | Estándar de facto para APIs REST en Django |
| **PostgreSQL** | 16 | Base de datos relacional robusta, JSONB para metadata flexible |
| **SimpleJWT** | 5.5 | Autenticación stateless por tokens, rotación + blacklist |
| **django-allauth** | 65.4 | Flujos de auth completos + verificación de email + MFA (TOTP) |
| **django-axes** | 5.41 | Protección contra fuerza bruta (lockout por IP + username) |
| **django-q2** | 1.10 | Tareas asíncronas con backend DB (sin Redis/Celery) |
| **mercadopago** | 3.1 | SDK oficial para procesamiento de pagos en Chile |
| **WeasyPrint** | 63.1 | Generación de PDFs (facturas, exportaciones) |
| **Resend** | 2.30 | Servicio de email transaccional |
| **google-generativeai** | 0.8+ | OCR de comprobantes de transferencia (Gemini) |
| **Sentry SDK** | 2.19 | Monitoreo de errores en producción |
| **drf-spectacular** | 0.28 | Documentación OpenAPI auto-generada |
| **Argon2** | — | Hashing de contraseñas (OWASP recomendado) |

### Frontend

| Tecnología | Versión | Justificación |
|------------|---------|---------------|
| **React** | 19.2 | Biblioteca de UI con últimas features (Server Components ready) |
| **TypeScript** | 6.0 | Tipado estricto, prevención de errores en compilación |
| **Vite** | 8.0 | Build tool ultra-rápido, HMR instantáneo |
| **Tailwind CSS** | 4.0 | Utility-first CSS, diseño consistente sin CSS custom |
| **TanStack Query** | 5.100 | Gestión de estado del servidor, caching, invalidación automática |
| **Zustand** | 5.0 | Estado global ligero (auth store, booking store) |
| **React Router** | 7.15 | Enrutamiento SPA con rutas protegidas |
| **Framer Motion** | 12.0 | Animaciones fluidas en transiciones y componentes |
| **Recharts** | 3.0 | Gráficos de métricas (dashboard, finanzas, curvas crecimiento) |
| **@mercadopago/sdk-react** | 1.0 | MercadoPago Bricks — formulario de pago embebido |
| **DOMPurify** | 3.0 | Sanitización de HTML (blog posts desde CKEditor) |

### DevOps y despliegue

| Tecnología | Uso |
|------------|-----|
| **Docker + Docker Compose** | Contenedorización de todos los servicios |
| **Nginx** | Reverse proxy, TLS termination, rate limiting, CSP headers |
| **Let's Encrypt (Certbot)** | Certificados SSL/TLS gratuitos y auto-renovables |
| **DigitalOcean** | VPS (Droplet) para hosting |
| **Git + GitHub** | Control de versiones, repositorio público |
| **Gunicorn** | WSGI server de producción (2 workers) |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                      INTERNET                           │
│                  estefipediatra.com                      │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS (443)
┌─────────────────────▼───────────────────────────────────┐
│                    NGINX                                 │
│  TLS 1.2/1.3 · Rate Limiting · CSP · Gzip · Cache      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ /api/* /admin│  │  /* (SPA)    │  │ /media /static│ │
│  │  → backend   │  │  → React    │  │  → filesystem │ │
│  └──────┬───────┘  └──────────────┘  └───────────────┘ │
└─────────┼───────────────────────────────────────────────┘
          │ :8000
┌─────────▼───────────────────────────────────────────────┐
│              DJANGO + DRF (Gunicorn)                     │
│                                                          │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌───────────┐  │
│  │  users  │ │ patients │ │ scheduling│ │  billing  │  │
│  ├─────────┤ ├──────────┤ ├───────────┤ ├───────────┤  │
│  │practice │ │med_records│ │  content  │ │notifications│ │
│  └────┬────┘ └────┬─────┘ └─────┬─────┘ └─────┬──────┘ │
│       │           │             │              │         │
│  ┌────▼───────────▼─────────────▼──────────────▼──────┐ │
│  │                  Django ORM                         │ │
│  └────────────────────┬───────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────┘
                        │ :5432
┌───────────────────────▼─────────────────────────────────┐
│                  PostgreSQL 16                            │
└─────────────────────────────────────────────────────────┘

Servicios externos:
  MercadoPago ─── Pagos con tarjeta + transferencia
  Resend ──────── Email transaccional
  Gemini ──────── OCR de comprobantes
  Zoom ────────── Links de telemedicina
  Sentry ──────── Monitoreo de errores
```

### Servicios Docker (producción)

| Servicio | Rol |
|----------|-----|
| `postgres` | Base de datos PostgreSQL 16 Alpine con healthcheck |
| `backend` | Django API (Gunicorn, 2 workers, user `django`) |
| `backend-qcluster` | Worker de tareas asíncronas (django-q2) |
| `nginx` | Reverse proxy + SPA React + archivos estáticos |
| `certbot` | Renovación automática de certificados TLS |

---

## Funcionalidades

### Portal público (Landing)
- Página de inicio con servicios, sedes, proceso de atención, FAQ
- Blog con artículos y videos educativos (CKEditor 5)
- Reserva online multi-sede con selección de servicio, fecha/hora, y pago

### Sistema de reservas
- Calendario dinámico por sede con slots disponibles
- Flujo multi-step: Sede → Servicio → Fecha/Hora → Auth → Tutor → Paciente → Pago
- Hold atómico de 15 minutos (previene doble reserva)
- Expiración automática de holds (django-q2 scheduled task)
- Soporte presencial y online (Zoom)
- Lista de espera automática

### Pagos (MercadoPago)
- Pago con tarjeta via MercadoPago Bricks (inline, sin redirect)
- Pago por transferencia bancaria con OCR de comprobantes (Gemini)
- Webhooks con verificación HMAC-SHA256
- Comprobante PDF generado con WeasyPrint
- Export XLSX de pagos y facturación

### Historia clínica pediátrica
- Notas SOAP estructuradas (Subjective, Objective, Assessment, Plan)
- Examen físico y signos vitales
- Antropometría con Z-score y percentiles OMS:
  - Peso/edad, Talla/edad, PC/edad, IMC/edad, Peso/talla
  - Ambos sexos, percentiles P3 P15 P50 P85 P97
- Diagnósticos con catálogo CIE
- Calendario de vacunación con esquema PNI Chile
- Archivos del paciente categorizados
- Audit log de acceso a registros médicos

### Portal del tutor (padres)
- Dashboard con próximos turnos y notificaciones
- Gestión de múltiples hijos
- Ficha de cada hijo con datos de crecimiento
- Historial de citas con detalle
- Reagendamiento y cancelación desde email (tokens seguros)
- Historial de pagos y comprobantes
- Perfil con completitud progresiva (%)

### Portal de la doctora (admin)
- Dashboard con métricas del día (citas, ingresos, pendientes)
- Calendario semanal interactivo con acciones por cita (confirmar, completar, cancelar, reagendar)
- Lista de pacientes con filtros por grupo etario y búsqueda
- Ficha clínica completa de cada paciente
- Gestión de pagos y transferencias pendientes
- Finanzas: calculadora fiscal, gastos mensuales, flujo de caja, simulador de arriendo
- Gestión de horarios, servicios, sedes y blog

### Comunicaciones
- Confirmación de reserva por email
- Recordatorios automáticos (24h y 2h antes)
- Notificación de cancelación y reagendamiento
- Auto-respondedor por horario
- Newsletter con suscripción y unsuscripción (HMAC tokens)

---

## Roles de usuario

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **Visitante** | Usuario no autenticado | Ver landing, blog, servicios, sedes. Iniciar booking (requiere registro para completar) |
| **Tutor** | Padre/madre registrado | Reservar turnos, gestionar hijos, ver historia clínica de sus hijos, pagar, cancelar/reagendar, recibir notificaciones |
| **Doctora** | Administradora (Dra. Ortigosa) | Todo lo del tutor + acceso completo a historias clínicas, gestión de agenda, finanzas, blog, configuración. Django admin con URL obfuscada |

---

## Estructura del proyecto

```
pediacore/
├── backend/
│   ├── apps/
│   │   ├── core/           # Base models, middleware, permissions, validators
│   │   ├── users/          # Custom User, registration, auth, profile
│   │   ├── practice/       # Practice, Location, Service, WorkingHours
│   │   ├── patients/       # Patient, TutorPatient, PatientFile
│   │   ├── medical_records/# Encounter, SOAP, PhysicalExam, Anthropometry, Vaccines
│   │   ├── scheduling/     # Appointment, availability, booking, waitlist, tokens
│   │   ├── billing/        # Payment, Invoice, MercadoPago, OCR, expenses
│   │   ├── content/        # BlogPost, Page, FAQ, Newsletter, Videos
│   │   └── notifications/  # Email service, reminders, templates, logs
│   ├── config/
│   │   ├── settings/       # base.py, development.py, production.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── tests/              # Integration tests (booking, tokens, webhooks)
│   └── requirements/       # base.txt, development.txt, production.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Shared components (auth, UI)
│   │   ├── features/       # Feature-based modules
│   │   │   ├── booking/    # Multi-step booking calendar
│   │   │   ├── doctor/     # Doctor admin portal (9 pages)
│   │   │   ├── tutor/      # Parent portal (14 pages)
│   │   │   ├── blog/       # Public blog
│   │   │   └── landing/    # Landing page components
│   │   ├── layouts/        # DoctorLayout, TutorLayout, PublicLayout
│   │   ├── stores/         # Zustand stores (auth, booking)
│   │   ├── lib/            # API client (axios + JWT interceptors)
│   │   ├── types/          # TypeScript interfaces
│   │   └── pages/          # Public pages (privacy, terms, services)
│   ├── public/             # Static assets, images, WHO data tables
│   └── vite.config.ts
├── infra/
│   ├── nginx/              # nginx.conf + Dockerfile
│   └── scripts/            # Deploy scripts
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production (5 services)
└── CLAUDE.md                   # AI context file
```

---

## Instalación y configuración

### Requisitos previos

- Docker y Docker Compose v2+
- Git
- Node.js 20+ y npm (para desarrollo frontend local)
- Python 3.12+ (para desarrollo backend local sin Docker)

### Clonar el repositorio

```bash
git clone https://github.com/silvanopuccini/pediacore.git
cd pediacore
```

### Configurar variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales

# Frontend
cp frontend/.env.example frontend/.env
# Editar frontend/.env
```

Ver la sección [Variables de entorno](#variables-de-entorno) para el detalle de cada variable.

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | `django-insecure-xxx` (dev) |
| `DEBUG` | Modo debug | `True` (dev) / `False` (prod) |
| `ALLOWED_HOSTS` | Hosts permitidos | `localhost,127.0.0.1` |
| `DATABASE_URL` | PostgreSQL connection | `postgres://user:pass@localhost:5432/pediacore` |
| `MERCADOPAGO_ACCESS_TOKEN` | MP access token | `APP_USR-xxx` |
| `MERCADOPAGO_WEBHOOK_SECRET` | MP webhook HMAC secret | (requerido en producción) |
| `RESEND_API_KEY` | Resend API key | `re_xxx` |
| `SENTRY_DSN` | Sentry DSN | `https://xxx@sentry.io/xxx` |
| `FRONTEND_URL` | URL del frontend | `http://localhost:5173` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `ZOOM_ACCOUNT_ID` | Zoom S2S account | — |
| `ZOOM_CLIENT_ID` | Zoom S2S client | — |
| `ZOOM_CLIENT_SECRET` | Zoom S2S secret | — |

### Frontend (`frontend/.env`)

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL del backend API (`http://localhost:8000`) |
| `VITE_MP_PUBLIC_KEY` | MercadoPago public key |

---

## Ejecución en desarrollo

### Con Docker (recomendado)

```bash
docker compose up --build
```

Esto levanta:
- **PostgreSQL** en `localhost:5432`
- **Backend** en `localhost:8000`
- **Frontend** en `localhost:5173`

### Sin Docker (desarrollo local)

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements/development.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Cargar datos iniciales

```bash
# Fixtures con servicios, sedes y horarios
python manage.py loaddata apps/practice/fixtures/initial_data.json

# Catálogo de vacunas PNI Chile
python manage.py loaddata apps/medical_records/fixtures/vaccine_schedule.json

# Catálogo de diagnósticos
python manage.py loaddata apps/medical_records/fixtures/diagnosis_catalog.json
```

---

## Testing

### Ejecutar tests

```bash
# Con Docker (modo estándar)
docker compose exec backend python -m pytest

# Con Docker (verbose + cobertura)
docker compose exec backend python -m pytest -v --cov=apps --cov-report=term-missing

# Sin Docker (requiere PostgreSQL local)
cd backend && pytest
```

### Estado actual

| Métrica | Valor |
|---------|-------|
| Tests totales | **773** |
| Archivos de test | **50** |
| Estado | **All passing** |

Los tests cubren:
- **Modelos**: validaciones, campos, relaciones, soft delete
- **Vistas/API**: permisos, status codes, serialización, filtros
- **Servicios**: booking atómico, cálculo de slots, hold expiry, payment processing
- **Seguridad**: HMAC webhooks, permisos IDOR, rate limiting, CSP
- **Integraciones**: MercadoPago mocks, email service mocks, OCR mocks

---

## Despliegue en producción

### Infraestructura

- **VPS**: DigitalOcean Droplet (Ubuntu)
- **Dominio**: estefipediatra.com (con DNS en DigitalOcean)
- **SSL**: Let's Encrypt via Certbot (auto-renovación)

### Deploy

```bash
ssh root@<server-ip>
cd /opt/pediacore
git pull origin main
sudo docker compose -f docker-compose.prod.yml up -d --build
```

### Servicios en producción

```yaml
# docker-compose.prod.yml define 5 servicios:
postgres:       # PostgreSQL 16 Alpine + healthcheck
backend:        # Django + Gunicorn (2 workers, user: django)
backend-qcluster: # django-q2 worker para tareas async
nginx:          # Reverse proxy + TLS + SPA + static files
certbot:        # Renovación SSL automática
```

---

## Seguridad

### Autenticación
- Hashing con **Argon2** (OWASP recomendado)
- JWT con access token de **15 minutos** y refresh de **7 días** con rotación y blacklist
- Verificación de email **obligatoria** antes de poder operar
- **MFA (TOTP)** disponible via django-allauth
- **django-axes**: lockout tras 5 intentos fallidos (15 min por IP + username)
- Validadores de contraseña de Django aplicados en todos los flujos

### Protección de datos
- **HTTPS obligatorio** con HSTS (1 año + preload)
- **TLS 1.2/1.3** exclusivamente, ciphers fuertes
- Cookies: `HttpOnly`, `Secure`, `SameSite=Lax`
- **Content Security Policy** (CSP) en middleware + nginx
- **X-Frame-Options: DENY** (anti-clickjacking)
- **AuditLog** en acceso a historias clínicas (IP, user-agent, timestamp)
- **Soft delete** en todas las entidades de negocio
- Secretos cargados desde `.env` vía `python-decouple` (nunca en código)

### Protección de API
- Permission classes en **todos** los endpoints (default: `IsAuthenticated`)
- Ownership checks en datos de pacientes (tutor solo ve sus hijos)
- Rate limiting: nginx (30 req/min API, 10 req/min login/admin) + DRF throttling
- DRF browsable API **deshabilitado** en producción
- Admin en URL obfuscada (`/gestion-9f3a/`)
- Webhook MercadoPago con verificación **HMAC-SHA256** (obligatorio en prod)
- Validación de uploads: tipo + extensión + tamaño (10MB máx)
- OpenAPI docs restringidos a staff

### Infraestructura
- Nginx bloquea archivos sensibles (`.env`, `.git`, `.sql`, `.py`, etc.)
- Gunicorn ejecuta como usuario no-root (`django`)
- PostgreSQL no expuesto externamente (solo red Docker interna)
- **Sentry** para monitoreo de errores

---

## Métricas del proyecto

| Métrica | Valor |
|---------|-------|
| Django apps | 9 |
| Modelos Django | 48 |
| ViewSets + APIViews | 69 |
| Endpoints API | ~102 |
| Tests | 773 (all passing) |
| Archivos Python (backend) | 236 |
| Líneas de código backend | 38,826 |
| Archivos TS/TSX (frontend) | 130 |
| Líneas de código frontend | 31,380 |
| Páginas React | 35+ |
| Componentes React | 95+ |
| Commits | 356 |
| Servicios Docker (prod) | 5 |
| Integraciones externas | 7 (MercadoPago, Resend, Gemini, Zoom, Sentry, Certbot, PostgreSQL) |

---

## Licencia

Proyecto privado. Todos los derechos reservados.

---

## Autor

**Silvano Puccini**
Proyecto Final de Máster — Máster en Desarrollo Full Stack, ConquerBlocks 2026.
