/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: { typedRoutes: true },

  async redirects() {
    return [
      {
        source: "/",
        destination: "/landing",
        permanent: false, // 307/308 temporal para evitar cache dura
      },
    ];
  },
};

module.exports = nextConfig;
