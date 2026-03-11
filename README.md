# Sistema de Gestión Académica

Plataforma integral para la gestión académica y escolar construida con Next.js (App Router), React 19 y Firebase.

## 🌟 Características Principales

- **Gestión Multi-Rol:** Accesos y paneles dedicados para Administradores, Directivos, Docentes, Estudiantes, Preceptores y Tutores.
- **Libro de Temas (Topic Book):** Módulo especializado con editor de texto enriquecido (integración con TipTap/Quill).
- **Backend Serverless:** Autenticación, Base de Datos en Tiempo Real y Almacenamiento gestionados por Firebase y Firebase Admin para operaciones seguras en el servidor.
- **Generación de Reportes:** Exportación de datos a PDF (`jspdf`) y Excel (`xlsx`).
- **Visualización de Datos:** Gráficos estadísticos y métricas de desempeño interactivos mediante `recharts`.
- **Comunicaciones Automatizadas:** Sistema de emails integrado mediante `nodemailer`.
- **UI Moderna y Responsiva:** Estilizado con TailwindCSS v4 y componentes construidos desde cero.

## 🏗️ Estructura del Proyecto

La arquitectura del proyecto sigue el patrón App Router de Next.js, organizado en la subcarpeta `src/`:

```text
src/
├── app/                  # Rutas y páginas (Next.js App Router)
│   ├── (auth)/           # Flujos de autenticación e inicio de sesión
│   ├── admin/            # Panel de control de Administración
│   ├── dashboard/        # Panel principal general
│   ├── directivo/        # Funciones para el equipo Directivo
│   ├── docente/          # Portal para Docentes
│   ├── estudiante/       # Portal para Estudiantes
│   ├── preceptor/        # Gestión y seguimiento por Preceptores
│   ├── tutor/            # Perfil para Tutores/Padres de familia
│   ├── profile/          # Gestión del perfil del usuario
│   ├── topic-book/       # Libro de temas interactivo
│   └── api/              # Endpoints API internos (Serverless Functions)
├── components/           # Componentes de interfaz de usuario reutilizables (UI)
├── hooks/                # Custom hooks de React para lógica de negocio
├── lib/                  # Utilidades compartidas y configuración (ej. Firebase init)
└── modules/              # Lógica de dominio modularizada
```

## 🛠️ Stack Tecnológico

- **Framework:** [Next.js 16](https://nextjs.org/) (React 19)
- **Estilos:** [TailwindCSS v4](https://tailwindcss.com/)
- **Base de Datos & Auth:** [Firebase](https://firebase.google.com/) (SDK Cliente y Admin)
- **Iconografía:** Material Design Icons (`@mdi/react`)
- **Herramientas de Exportación:** `jspdf`, `jspdf-autotable`, `xlsx`
- **Gráficos:** `recharts`
- **Mail:** `nodemailer`

## ⚙️ Configuración y Variables de Entorno

Para ejecutar el proyecto localmente, debes crear un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

### Firebase Client
```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=tu_measurement_id
```

### Firebase Admin (Server-side)
```env
FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_CLIENT_EMAIL=tu_client_email
FIREBASE_PRIVATE_KEY="tu_private_key"
```

### Configuración SMTP (Emails)
```env
SMTP_HOST=smtp.ejemplo.com
SMTP_PORT=587
SMTP_USER=usuario_smtp
SMTP_PASS=password_smtp
SMTP_FROM=no-reply@tudominio.com
SMTP_SECURE=false # o "true"
```

### Configuración WhatsApp (Opcional - Twilio)
```env
TWILIO_ACCOUNT_SID=tu_sid
TWILIO_AUTH_TOKEN=tu_token
TWILIO_WHATSAPP_FROM=tu_numero_origen
```

## 🚀 Instalación y Despliegue

1. Instala las dependencias necesarias:
```bash
npm install
```

2. Inicia el servidor de desarrollo en modo Turbopack:
```bash
npm run dev
```

3. Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

_Este entorno está diseñado para ser desplegado de manera nativa y rápida en [Vercel](https://vercel.com/new)._
