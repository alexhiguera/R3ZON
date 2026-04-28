/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'export' permite empaquetar como SPA estática para Capacitor (móvil) — coste 0€.
  // Comentar esta línea si se despliega en Vercel con SSR.
  output: process.env.NEXT_OUTPUT_MODE === "export" ? "export" : undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
