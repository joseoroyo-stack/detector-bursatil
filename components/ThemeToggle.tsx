"use client";

import React from "react";

/** Botón flotante que pone/quita la clase 'dark' en <html> y persiste en localStorage */
export default function ThemeToggle() {
  const [isDark, setIsDark] = React.useState<boolean>(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      const shouldDark = saved ? saved === "dark" : prefersDark;
      setIsDark(shouldDark);
      document.documentElement.classList.toggle("dark", shouldDark);
    } catch {}
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };

  return (
    <button
      onClick={toggle}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90"
    >
      {isDark ? "☀️ Claro" : "🌙 Oscuro"}
    </button>
  );
}
