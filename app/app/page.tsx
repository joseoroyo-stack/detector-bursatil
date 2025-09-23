// app/app/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Reexporta el componente de la plataforma
// Si tu archivo está en app/home-clients.tsx, esta ruta es correcta.
// Si está en otro sitio, ajusta el camino relativo.
export { default } from "../home-clients";
