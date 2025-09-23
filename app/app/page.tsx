// app/app/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Reexporta la plataforma desde app/home-clients.tsx
export { default } from "@/app/home-clients";
