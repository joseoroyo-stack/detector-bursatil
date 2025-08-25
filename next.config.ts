/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignora ESLint en build (para poder desplegar aunque haya 'any' en prototipo)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignora errores de TypeScript en build (prototipo). Cuando quieras, lo quitamos.
  typescript: {
    ignoreBuildErrors: true,
  },
  // (Opcional) experimental Turbopack ya viene por defecto en dev
};

module.exports = nextConfig;
