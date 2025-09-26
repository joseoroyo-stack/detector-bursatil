// app/scanner/layout.tsx
export const dynamic = "force-dynamic";

export default function ScannerLayout({
  children,
}: { children: React.ReactNode }) {
  // Passthrough total: NUNCA oculta la plataforma
  return <>{children}</>;
}
