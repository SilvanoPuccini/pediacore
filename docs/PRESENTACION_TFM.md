# PEDIACORE — Documento de Proyecto Final de Máster

**Máster en Desarrollo Full Stack — ConquerBlocks**
**Alumno:** Silvano Puccini
**Fecha:** Junio 2026
**Repositorio:** github.com/silvanopuccini/pediacore
**URL producción:** https://estefipediatra.com

---

## 1. Definición del problema

### Contexto

Los consultorios pediátricos independientes en Chile enfrentan una realidad operativa fragmentada. La Dra. Estefanía Ortigosa atiende en dos sedes (Pucón y Villarrica), y antes de PEDIACORE su operación diaria dependía de:

- **Agenda en papel o Google Calendar** para gestionar turnos, sin sistema de reserva online
- **WhatsApp personal** como único canal de comunicación con los padres, generando una carga constante de mensajes para confirmar, cancelar y reagendar turnos
- **Fichas clínicas en papel o planillas Excel** sin estructura estandarizada, sin curvas de crecimiento automatizadas, sin búsqueda eficiente
- **Pagos en efectivo o transferencia** sin trazabilidad ni comprobantes automatizados
- **Cero presencia digital profesional**: sin sitio web, sin información de servicios online, sin posibilidad de que un paciente nuevo encuentre y reserve una cita de forma autónoma

### Carencias detectadas

1. **No existe una solución vertical para pediatría en Chile**: los sistemas de agenda médica genéricos (Reservo, Doctoralia) no incluyen historia clínica pediátrica con antropometría OMS, vacunas PNI, ni ficha de desarrollo infantil.

2. **Pérdida de tiempo administrativo**: la doctora invierte entre 1.5 y 2 horas diarias en tareas que no son atención médica: responder WhatsApp, confirmar turnos, recordar pagos pendientes.

3. **Datos clínicos no estructurados**: sin un sistema que calcule Z-scores y percentiles automáticamente, la evaluación nutricional requiere consultar tablas OMS manualmente en cada control.

4. **Inasistencias sin control**: sin recordatorios automáticos ni política de cancelación, la tasa de no-show puede superar el 15% en consultorios independientes.

5. **Nula visibilidad digital**: padres potenciales en zonas turísticas (Pucón) no encuentran a la doctora online, perdiendo pacientes que buscan "pediatra en Pucón" en Google.

### Solución propuesta

PEDIACORE es una plataforma web full stack que unifica en un solo sistema:

- **Sitio público** con landing page profesional, blog educativo, y descripción de servicios y sedes
- **Reserva online** con calendario dinámico, selección de sede/servicio, y pago integrado con MercadoPago
- **Historia clínica pediátrica digital** con notas SOAP estructuradas, examen físico, antropometría con cálculo automático de Z-score y percentiles según tablas OMS (peso/edad, talla/edad, IMC/edad, PC/edad, peso/talla, ambos sexos)
- **Portal para padres** donde gestionan turnos, ven los datos de crecimiento de sus hijos, reciben notificaciones y pagan
- **Panel administrativo para la doctora** con dashboard de métricas, calendario interactivo, gestión financiera y de contenido

La plataforma está desplegada en producción en **estefipediatra.com** y es utilizada activamente por la Dra. Ortigosa y sus pacientes.

### Impacto esperado

| Área | Antes | Con PEDIACORE |
|------|-------|---------------|
| Reserva de turnos | WhatsApp manual | Online 24/7 con pago incluido |
| Confirmaciones | Llamadas/WhatsApp 1 por 1 | Email automático + recordatorios 24h y 2h |
| Historia clínica | Papel / Excel sin estructura | SOAP + antropometría OMS digital |
| Curvas de crecimiento | Tablas OMS manuales | Cálculo automático Z-score + gráficos |
| Pagos | Efectivo / transferencia sin control | MercadoPago con trazabilidad completa |
| Presencia digital | Ninguna | Landing + blog + SEO local |
| Tiempo admin/día | ~2 horas | ~20 minutos (estimado) |

---

## 2. Reflexión: aportación y eficiencia

### Qué procesos mejora la herramienta

**Flujo de reserva (antes vs. después):**

*Antes:* El padre escribe por WhatsApp, la doctora responde (a veces horas después), intercambian mensajes para encontrar fecha, acuerdan horario, el padre a veces no viene, no hay registro del turno perdido.

*Con PEDIACORE:* El padre entra a estefipediatra.com, ve servicios y sedes, selecciona fecha/hora con disponibilidad real, se registra, completa datos del hijo, paga online, recibe confirmación por email, recibe recordatorio 24h y 2h antes. Si cancela, el sistema aplica la política de cancelación y libera el slot para lista de espera.

**Flujo clínico (antes vs. después):**

*Antes:* La doctora abre una carpeta de papel, busca la última ficha, escribe a mano, calcula percentiles con tabla OMS impresa, no tiene gráfico de evolución, al siguiente control repite todo el proceso.

*Con PEDIACORE:* La doctora abre la ficha del paciente, ve el historial completo con todas las consultas anteriores, crea un nuevo encuentro, escribe notas SOAP en formulario estructurado, ingresa peso/talla/PC, el sistema calcula automáticamente Z-scores y percentiles OMS, grafica la evolución, todo queda registrado con audit log.

### Qué tareas se automatizan

1. **Recordatorios de citas**: django-q2 programa emails 24h y 2h antes de cada cita
2. **Expiración de holds**: si un paciente abandona el pago, el hold de 15 min expira automáticamente y el slot se libera
3. **Cálculo antropométrico**: Z-scores y percentiles calculados instantáneamente con tablas OMS integradas
4. **Comprobantes de pago**: factura PDF generada automáticamente con WeasyPrint
5. **Auto-respondedor**: fuera de horario de atención, el sistema responde automáticamente
6. **Lista de espera**: cuando se libera un turno (cancelación), el sistema notifica a los pacientes en espera
7. **OCR de comprobantes**: cuando un paciente sube una foto de transferencia bancaria, Gemini extrae los datos automáticamente

### Beneficios concretos

- **Para la doctora**: recupera ~1.5 horas diarias de trabajo administrativo, tiene datos clínicos estructurados para cada paciente, puede operar desde dos sedes con una sola herramienta
- **Para los padres**: reservan online sin esperar respuesta, ven los datos de crecimiento de sus hijos, pagan con tarjeta o transferencia, reciben recordatorios
- **Para el consultorio**: visibilidad digital profesional, trazabilidad financiera completa, cumplimiento de buenas prácticas en protección de datos médicos

### Uso de IA como herramienta de desarrollo

Este proyecto fue desarrollado utilizando IA (Claude Code) como herramienta de asistencia al desarrollo, bajo el principio de "la IA ejecuta, el humano dirige". Todas las decisiones de arquitectura, diseño de modelos, flujos de negocio y priorización fueron tomadas por el desarrollador. La IA fue utilizada para:

- Acelerar la implementación de código repetitivo (serializers, views CRUD, tests)
- Asistir en la investigación de integraciones (MercadoPago SDK, tablas OMS, HMAC webhooks)
- Realizar auditorías de seguridad y sugerir correcciones
- Mantener consistencia en patrones de código a través del proyecto

La comprensión técnica profunda del stack (Django, DRF, React, TypeScript, Docker, PostgreSQL) fue requisito previo para poder dirigir la herramienta efectivamente.

---

## 3. Listado de tecnologías utilizadas

### Backend (obligatorio — Django)

| Tecnología | Versión | Justificación |
|------------|---------|---------------|
| Python | 3.12 | Última versión estable, type hints nativos, mejoras de performance |
| Django | 5.2.1 | Framework principal obligatorio del máster. ORM maduro, sistema de migraciones, admin extensible, middleware pipeline, sistema de permisos granular |
| Django REST Framework | 3.16.0 | Estándar de la industria para APIs REST en Django. ViewSets, serializers, permission classes, throttling, filtros |
| PostgreSQL | 16 (Alpine) | Base de datos relacional robusta con soporte JSONB para metadata flexible de pagos y configuraciones |
| SimpleJWT | 5.5.0 | Autenticación stateless por tokens JWT. Access token de 15 min + refresh rotativo de 7 días con blacklist |
| django-allauth | 65.4.1 | Gestión completa de flujos de autenticación: registro, verificación de email, reset de password, MFA (TOTP) |
| django-axes | 5.41+ | Protección contra ataques de fuerza bruta. Lockout configurable por IP + username |
| django-q2 | 1.10.0 | Cola de tareas asíncronas con backend de base de datos. Usado para: expiración de holds, recordatorios, newsletter |
| mercadopago SDK | 3.1.1 | SDK oficial de MercadoPago para Chile. Procesamiento de pagos, verificación de webhooks, consulta de estado |
| WeasyPrint | 63.1 | Generación de PDFs a partir de HTML/CSS. Usado para facturas y exportación de perfiles |
| Resend | 2.30.1 | Servicio de email transaccional. Confirmaciones, recordatorios, notificaciones de cancelación |
| google-generativeai | 0.8+ | API de Google Gemini para OCR inteligente de comprobantes de transferencia bancaria |
| Sentry SDK | 2.19.2 | Monitoreo de errores en producción con sampling configurable |
| drf-spectacular | 0.28.0 | Generación automática de esquema OpenAPI 3.0, documentación Swagger y ReDoc |
| Argon2-cffi | -- | Hashing de contraseñas recomendado por OWASP como primera opción |
| openpyxl | 3.1+ | Exportación de datos financieros a formato XLSX |
| django-ckeditor-5 | 0.2.20 | Editor de texto enriquecido para blog posts |
| django-unfold | 0.81.0 | Tema moderno para el Django admin |
| django-ratelimit | 4.1+ | Rate limiting por decorator en endpoints específicos |
| pytest + factory_boy | -- | Framework de testing con factories para generar datos de prueba |

### Frontend (parcialmente obligatorio — React con datos reales del backend)

| Tecnología | Versión | Justificación |
|------------|---------|---------------|
| React | 19.2 | Biblioteca de UI principal. Componentes funcionales con hooks |
| TypeScript | 6.0 | Tipado estricto sobre JavaScript. Previene errores en compilación, mejora DX con autocompletado |
| Vite | 8.0 | Build tool moderno con HMR instantáneo. Reemplaza a webpack con configuración mínima |
| Tailwind CSS | 4.0 | Framework CSS utility-first. Diseño consistente sin archivos CSS custom |
| TanStack Query | 5.100 | Gestión de estado del servidor: caching, refetch automático, invalidación por mutation, estados de loading/error |
| Zustand | 5.0 | Estado global ligero para auth y booking flow. Alternativa simple a Redux |
| React Router | 7.15 | Enrutamiento SPA con rutas protegidas por rol (ProtectedRoute) |
| Axios | 1.9 | Cliente HTTP con interceptores para JWT (auto-refresh del access token) |
| Framer Motion | 12.0 | Animaciones declarativas para transiciones de página y componentes |
| Recharts | 3.0 | Librería de gráficos React. Usada en dashboard de métricas, finanzas, y curvas de crecimiento |
| MercadoPago SDK React | 1.0.7 | MercadoPago Bricks: formulario de pago con tarjeta embebido inline (sin redirect) |
| DOMPurify | 3.0 | Sanitización de HTML del blog (prevención de XSS) |

### DevOps y despliegue

| Tecnología | Justificación |
|------------|---------------|
| Docker + Docker Compose | Contenedorización de todos los servicios. Mismo entorno en desarrollo y producción |
| Nginx | Reverse proxy con TLS termination, rate limiting por endpoint, Content Security Policy, compresión gzip, cache de assets |
| Let's Encrypt (Certbot) | Certificados SSL gratuitos con renovación automática |
| Gunicorn | Servidor WSGI de producción (2 workers, usuario no-root) |
| DigitalOcean Droplet | VPS con costo predecible, control total |
| Git + GitHub | Control de versiones con conventional commits. 356 commits en 21 días de desarrollo |

---

## 4. Definición de tipos de usuarios

### Visitante (no autenticado)

| Acción | Detalle |
|--------|---------|
| Ver landing page | Información completa: servicios, sedes, proceso, equipo, FAQ |
| Leer blog | Artículos y videos educativos sobre pediatría |
| Ver servicios | Descripción, duración y precio de cada tipo de consulta |
| Iniciar reserva | Puede seleccionar sede, servicio, fecha/hora, pero debe registrarse para completar |
| Suscribirse al newsletter | Con protección anti-spam (honeypot + rate limit) |

### Tutor (padre/madre registrado)

| Acción | Detalle |
|--------|---------|
| Completar reserva online | Flujo multi-step hasta pago con MercadoPago o transferencia |
| Gestionar hijos | Agregar pacientes (hijos), ver ficha de cada uno |
| Ver datos clínicos | Historial de consultas, datos de crecimiento, vacunas (solo de SUS hijos) |
| Gestionar turnos | Ver próximas citas, cancelar, reagendar (con política de cancelación) |
| Pagar | Tarjeta vía MercadoPago Bricks, transferencia bancaria con upload de comprobante |
| Ver comprobantes | Historial de pagos con PDF descargable |
| Recibir notificaciones | Confirmación, recordatorios 24h/2h, cancelaciones, reagendamientos |
| Editar perfil | Datos personales, completitud progresiva (%), avatar |
| Responder desde email | Links con tokens seguros para confirmar/cancelar/reagendar sin login |

### Doctora (administradora)

| Acción | Detalle |
|--------|---------|
| Dashboard | Métricas del día: citas, ingresos, pendientes, tasa de cobro |
| Calendario interactivo | Vista semanal con acciones por cita: confirmar, completar, no-show, cancelar, reagendar |
| Gestionar pacientes | Lista completa, filtros por grupo etario, búsqueda por nombre/RUT |
| Historia clínica | Crear encuentros SOAP, examen físico, signos vitales, antropometría con Z-score OMS, diagnósticos, vacunas |
| Gestionar pagos | Confirmar/rechazar transferencias, ver historial, exportar XLSX |
| Finanzas | Calculadora fiscal, gastos mensuales, flujo de caja, simulador |
| Gestionar contenido | Blog posts (CKEditor), newsletter, FAQ |
| Configuración | Horarios por sede, servicios, sedes, política de cancelación |
| Django Admin | Acceso completo en URL obfuscada con protección axes |

### Control de acceso

- El rol no puede ser modificado por el usuario (read-only en serializer, hardcoded como TUTOR en registro)
- Un tutor solo ve datos de sus hijos (filtrado a nivel de queryset por relación TutorPatient)
- Las historias clínicas tienen audit log (IP, user-agent, timestamp de cada acceso)
- Los endpoints de pago validan ownership (tutor solo opera sobre sus propios pagos)
- La doctora accede a todo vía permission class IsDoctor

---

## 5. Casos de uso

### CU-01: Reserva online completa (Tutor)

**Precondición:** Visitante accede a estefipediatra.com

**Flujo principal:**
1. El visitante navega a la landing page y hace click en "Reservar hora"
2. El sistema muestra las sedes disponibles (Pucón, Villarrica)
3. El usuario selecciona una sede; el sistema muestra los servicios disponibles en esa sede
4. Selecciona un servicio (ej: "Control niño sano", 45 min, $35.000)
5. El sistema muestra un calendario con los días que tienen disponibilidad
6. Selecciona un día; el sistema calcula slots dinámicos basados en WorkingHours y citas existentes
7. Selecciona un horario; el sistema crea un HOLD atómico de 15 minutos (previene doble reserva)
8. Si no está logueado, se muestra formulario de registro/login
9. El usuario se registra (email, password, nombre); recibe email de verificación; verifica
10. Completa datos del tutor (teléfono, RUT)
11. Selecciona o crea un paciente (hijo)
12. Selecciona método de pago:
    - Tarjeta: MercadoPago Bricks renderiza formulario inline, tokeniza, backend procesa, respuesta inmediata
    - Transferencia: se muestran datos bancarios, usuario sube comprobante, Gemini hace OCR, doctora confirma manualmente
13. Pago aprobado; cita confirmada; email de confirmación enviado
14. El sistema programa recordatorios automáticos (24h y 2h antes)

**Flujos alternativos:**
- Si el hold expira (15 min sin pago): cita pasa a EXPIRED, slot se libera
- Si el pago falla: se muestra mensaje de error, usuario puede reintentar
- Si la sede está sin disponibilidad: se muestra calendario del mes siguiente

**Resultado:** Cita confirmada con pago, registrada en el sistema, con recordatorios programados.

---

### CU-02: Consulta pediátrica con historia clínica (Doctora)

**Precondición:** La doctora está logueada en el portal y tiene una cita confirmada

**Flujo principal:**
1. La doctora abre el calendario del día y ve las citas programadas
2. Hace click en la cita; ve detalles del paciente y servicio
3. Marca la cita como "Completada" (cambia estado a COMPLETED)
4. Navega a la ficha del paciente desde la lista de pacientes
5. Crea un nuevo encuentro (Encounter) vinculado a la cita
6. Completa la nota SOAP:
   - Subjective: motivo de consulta, síntomas referidos por los padres
   - Objective: hallazgos del examen físico
   - Assessment: diagnóstico (con catálogo CIE)
   - Plan: indicaciones, próximo control
7. Registra signos vitales (temperatura, FC, FR, saturación)
8. Registra antropometría (peso, talla, perímetro cefálico)
9. El sistema calcula automáticamente:
   - Z-score de peso/edad según tablas OMS
   - Percentil correspondiente (P3, P15, P50, P85, P97)
   - Idem para talla/edad, IMC/edad, PC/edad
   - Estado nutricional (eutrófico, riesgo desnutrición, sobrepeso, etc.)
10. El gráfico de curvas de crecimiento se actualiza en tiempo real
11. Opcionalmente actualiza el esquema de vacunación del paciente

**Resultado:** Encuentro clínico completo registrado con datos estructurados, curvas de crecimiento actualizadas, auditoría de acceso registrada.

---

### CU-03: Cancelación y reagendamiento (Tutor)

**Precondición:** Tutor tiene una cita confirmada y recibe email de recordatorio

**Flujo principal — Cancelación:**
1. El tutor recibe el email de recordatorio (24h antes)
2. Hace click en "Cancelar cita"; link con token seguro (AppointmentToken)
3. El sistema valida el token (no expirado, no usado)
4. Muestra los detalles de la cita y pide confirmación
5. El tutor confirma; la cita pasa a estado CANCELLED
6. Si corresponde reembolso según la política de cancelación (CancellationTier), se procesa
7. El slot se libera; si hay pacientes en lista de espera, se les notifica
8. El token se marca como usado (single-use)

**Flujo principal — Reagendamiento:**
1. El tutor hace click en "Reagendar" desde el email o su portal
2. El sistema muestra disponibilidad futura para el mismo servicio y sede
3. El tutor selecciona nueva fecha/hora
4. La cita original pasa a RESCHEDULED, se crea una nueva cita CONFIRMED
5. Emails de confirmación enviados

**Flujo alternativo — Token expirado:**
- Si el token tiene más de 48h, retorna HTTP 410 Gone con mensaje explicativo

**Resultado:** Cita cancelada/reagendada correctamente, slots actualizados, notificaciones enviadas.

---

### CU-04: Gestión financiera (Doctora)

**Precondición:** La doctora está logueada en el portal admin

**Flujo principal:**
1. Navega a la sección "Pagos"; ve lista de todos los pagos con filtros por estado
2. Ve el resumen: total cobrado, pendientes, tasa de cobro
3. Para transferencias pendientes: ve el comprobante subido por el tutor; confirma o rechaza
4. Navega a "Finanzas"; usa la calculadora fiscal:
   - Ingresa monto; calcula IVA, retención, neto (boleta vs factura)
5. Registra gastos mensuales (arriendo, insumos, sueldo)
6. Ve el gráfico de flujo de caja mensual (ingresos vs gastos)
7. Exporta datos a XLSX para el contador

**Resultado:** Trazabilidad financiera completa, cálculos fiscales automatizados, exportación para contabilidad.

---

### CU-05: Registro y verificación de email (Visitante a Tutor)

**Precondición:** Usuario no registrado

**Flujo principal:**
1. El usuario accede al formulario de registro
2. Ingresa: email, password (2 veces), nombre, apellido
3. El sistema valida: email único, password cumple AUTH_PASSWORD_VALIDATORS, RUT válido (mod-11)
4. Se crea el usuario con rol TUTOR (hardcoded, no manipulable)
5. Se envía email de verificación vía Resend
6. El usuario hace click en el link de verificación
7. email_verified_at se actualiza; el usuario puede operar normalmente

**Flujo alternativo — Email ya registrado:** El sistema retorna error 400 indicando que el email ya está en uso.

**Flujo alternativo — Password débil:** El sistema retorna errores de validación específicos.

**Posible error:** Rate limiting: máximo 15 registros/hora por IP (protección anti-spam).

**Resultado:** Usuario registrado con email verificado, rol TUTOR asignado, perfil con completitud progresiva activa.

---

### CU-06: Acceso a datos del hijo (Tutor)

**Precondición:** Tutor logueado con al menos un hijo vinculado

**Flujo principal:**
1. El tutor navega a "Mis hijos" en su portal
2. Ve la lista de sus hijos con datos básicos (nombre, edad, grupo etario)
3. Hace click en un hijo; ficha completa: datos de identificación, gráfico de curvas de crecimiento, estado nutricional actual, últimas consultas, esquema de vacunación
4. El tutor puede ver pero NO puede modificar datos clínicos (solo lectura)

**Control de acceso:**
- El queryset filtra por TutorPatient(tutor=request.user); el tutor SOLO ve sus hijos
- Si intenta acceder a un paciente ajeno: retorna 404 (no 403, para no revelar existencia)
- Cada acceso a datos clínicos genera un registro en AuditLog

**Resultado:** Tutor accede a datos de sus hijos de forma segura, con aislamiento completo de datos de otros pacientes.

---

## 6. Seguridad y protección de datos

### 6.1. Autenticación

**Hashing de contraseñas:**
- Algoritmo principal: Argon2id (recomendado por OWASP como primera opción)
- Fallbacks: PBKDF2-SHA256, BCrypt, Scrypt (para migración de passwords legacy)

**Validación de contraseñas (aplicada en registro, reset y cambio):**
- UserAttributeSimilarityValidator: no similar al email/nombre
- MinimumLengthValidator: mínimo 8 caracteres
- CommonPasswordValidator: no en lista de 20,000 passwords comunes
- NumericPasswordValidator: no completamente numérica

**Autenticación por tokens JWT:**
- Access token: 15 minutos (limita ventana de exposición)
- Refresh token: 7 días con rotación obligatoria en cada uso
- Blacklist: refresh tokens anteriores invalidados tras rotación

**Protección contra fuerza bruta:**
- django-axes: lockout tras 5 intentos fallidos por 15 minutos (por IP + username)
- Rate limiting en nginx: 10 requests/minuto en endpoint de login
- Rate limiting DRF: 500 req/hora anónimos, 3000 req/hora autenticados

**Verificación de email obligatoria:**
- ACCOUNT_EMAIL_VERIFICATION = "mandatory"

**MFA disponible:**
- TOTP (Time-based One-Time Password) configurado vía django-allauth MFA

### 6.2. Validación y protección contra inyección

**SQL Injection:** CERO uso de raw SQL en todo el proyecto. Todas las consultas via Django ORM. No existe raw(), .extra(), ni cursor.execute() en ningún archivo.

**XSS (Cross-Site Scripting):** React escapa automáticamente todo contenido por defecto. Único uso de dangerouslySetInnerHTML protegido con DOMPurify.sanitize(). Content Security Policy (CSP) aplicada en middleware Django y en nginx. SVG eliminado de tipos de upload permitidos.

**CSRF:** CSRF_COOKIE_SECURE, CSRF_COOKIE_HTTPONLY, y CSRF_COOKIE_SAMESITE = "Lax" en producción. API usa JWT (stateless) reduciendo superficie CSRF.

**Command Injection:** No existe os.system(), subprocess, eval() ni exec() en el código.

### 6.3. Protección de datos en tránsito

- HTTPS obligatorio (SECURE_SSL_REDIRECT = True)
- Certificado Let's Encrypt con renovación automática
- TLS 1.2 y 1.3 exclusivamente (TLS 1.0/1.1 deshabilitados)
- HSTS: 1 año con subdomains + preload
- Headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, CSP

### 6.4. Gestión de secretos

- Todos los secretos cargados desde .env vía python-decouple (nunca en código)
- .env incluido en .gitignore (nunca commiteado)
- Variables críticas validadas en arranque de producción
- Webhook MercadoPago con verificación HMAC-SHA256 obligatoria

### 6.5. Control de acceso y aislamiento de datos

- Default global: IsAuthenticated (ningún endpoint abierto por accidente)
- Querysets filtrados a nivel de ORM: tutor solo ve sus hijos
- Ownership checks en uploads de archivos y acciones de pago
- Audit log de acceso a historias clínicas (IP, user-agent, timestamp)
- Soft delete en todas las entidades de negocio

### 6.6. Seguridad de infraestructura

- Nginx bloquea archivos sensibles (.env, .git, .sql, .py, backups)
- PostgreSQL no expuesto externamente (solo red Docker interna)
- Gunicorn ejecuta como usuario no-root (django)
- Admin en URL obfuscada (/gestion-9f3a/) con protección axes
- Browsable API de DRF deshabilitado en producción

### 6.7. Auditoría de seguridad realizada

Se realizó una auditoría de seguridad completa cubriendo autenticación/autorización, OWASP Top 10 2021, y API/protección de datos. Se identificaron y corrigieron 17 vulnerabilidades (2 CRITICAL, 7 HIGH, 8 MEDIUM) antes del deploy final.

---

## Requisitos técnicos (checklist de cumplimiento)

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Backend en Django con modelos, vistas, autenticación y persistencia | Cumplido | 9 apps Django, 42 modelos, 71 ViewSets/APIViews, JWT auth, PostgreSQL 16 |
| Frontend React (mínimo 1-2 vistas con datos reales del backend) | Excedido | 35+ páginas React, 95+ componentes, TanStack Query consumiendo datos reales de la API REST |
| Despliegue funcional en URL pública | Cumplido | estefipediatra.com con Docker Compose en DigitalOcean, HTTPS, dominio propio |
| Repositorio GitHub con README y commits significativos | Cumplido | 356 commits con conventional commits, README completo |

---

## Métricas del proyecto

| Métrica | Valor |
|---------|-------|
| Apps Django | 9 |
| Modelos | 42 |
| ViewSets + APIViews | 71 |
| Endpoints API | ~102 |
| Tests automatizados | 773 (all passing) |
| Archivos de test | 50 |
| Líneas backend (Python) | 35,536 |
| Líneas frontend (TS/TSX) | 31,380 |
| Total líneas de código | ~67,000 |
| Páginas React | 35+ |
| Componentes React | 95+ |
| Commits | 356 |
| Días de desarrollo | 21 |
| Servicios Docker (prod) | 5 |
| Integraciones externas | 7 |
| Vulnerabilidades corregidas | 17 |

---

## Entregables

1. **Repositorio GitHub**: github.com/silvanopuccini/pediacore (público, con README completo)
2. **Aplicación desplegada**: https://estefipediatra.com (funcional y accesible)
3. **Documento del proyecto**: este documento (PDF)
4. **Video explicativo**: [enlace pendiente] (máximo 5 minutos)
