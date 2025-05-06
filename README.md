# Geo-App 🌍

Geo-App es una aplicación web moderna para compartir ubicación en tiempo real con grupos. Desarrollada con Next.js, TypeScript y Supabase, ofrece una experiencia intuitiva y segura para coordinar la ubicación de múltiples usuarios.

Podeis probar la aplicación web directamente desde el siguiente enlace: https://geolocalization-app.vercel.app/

## Características Principales ✨

- 🚀 Compartir ubicación en tiempo real
- 👥 Gestión de grupos y salas virtuales
- 🔒 Sistema de autenticación seguro
- 🗺️ Visualización en mapa interactivo
- 📱 Diseño responsivo
- 🔐 Control de privacidad por sala

## Tecnologías Utilizadas 🛠️

- **Frontend:**
  - Next.js 14
  - TypeScript
  - Tailwind CSS
  - React Leaflet

- **Backend:**
  - Supabase
  - PostgreSQL
  - API REST

## Requisitos Previos 📋

- Node.js 18.0.0 o superior
- npm o yarn
- Cuenta en Supabase

## Instalación 🚀

1. Clona el repositorio:
   ```bash
   git clone https://github.com/g1okz/geo-app.git
   cd geo-app
   ```

2. Instala las dependencias:
   ```bash
   npm install
   # o
   yarn install
   ```

3. Configura las variables de entorno:
   Crea un archivo `.env.local` en la raíz del proyecto con:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   # o
   yarn dev
   ```

5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto 📁

```
geo-app/
├── src/
│   ├── app/              # Rutas de la aplicación
│   ├── components/       # Componentes React
│   ├── lib/             # Utilidades y configuraciones
│   ├── types/           # Definiciones de TypeScript
│   └── styles/          # Estilos globales
├── public/              # Archivos estáticos
└── package.json         # Dependencias y scripts
```

## Uso 🎯

1. **Registro y Autenticación**
   - Crea una cuenta o inicia sesión

2. **Gestión de Salas**
   - Crea una nueva sala
   - Invita a otros usuarios

3. **Compartir Ubicación**
   - Únete a una sala existente
   - Activa el compartir ubicación
   - Visualiza las ubicaciones en el mapa

4. **Personalización**
   - Personaliza los marcadores del mapa

## Contribución 🤝

Las contribuciones son bienvenidas.

## Licencia 📄

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.


---

Desarrollado con ❤️ por [Miguel Reyna]

