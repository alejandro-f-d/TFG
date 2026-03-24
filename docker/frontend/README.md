# Apuntes Next.js:
- `/app`: Contiene las rutas los componentes y la lógica del frontend.
- `/app/lib`: Funciones usadas en la app. Para la **reutilización de las mismas**.
- `/app/ui`: Los componentes UI de la aplicación.
  En este path, se deben encontrar los elementos como las cards, las tablas y los formularios. 
- `/public`: Los assets estáticos. En este carpeta se encontrarías elementos como los logos de medal, de los accesos del menú, etc. 
- Ficheros de configuración. Ficheros como `next.config.ts`.

## Instalación manual de las herramientas:
```bash
npm i next@latest react@latest react-dom@latest
npm install
npm run dev
```

## Ejecución:
Todo se ejecuta en relación padre-hijo. Se carga todo desde la raíz que es `/app`.

## Ficheros de interés: 
Dentro de **/app**.
- `layaout.tsx`: Definir el layout de la aplicación tales como la navegación, cabeceras,...
- `loading.tsx`: Pantalla de cargando de la aplicación.
- `error.tsx`: Para la gestión de errores del frontend.
- `index.tsx`: El homepage de la aplicación. 
- `route.ts`: Para definir las rutas de las APIs.
- `not-found.tsx`: 404 página no encontrada. 

## Creación de subpáginas: 
Para la creación de páginas lo que se hace es dentro de **app/** crear directorios con la página en cuestión.

