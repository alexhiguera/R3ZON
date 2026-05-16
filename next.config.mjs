/** @type {import('next').NextConfig} */

const isExport = process.env.NEXT_OUTPUT_MODE === "export";

const CSP_DIRECTIVES = [
  "default-src 'self'",
  // Next.js inline runtime + Stripe.js + Vercel Analytics + scripts de boot (theme/a11y).
  // jsDelivr es el CDN por defecto de tesseract.js (worker + tesseract-core wasm-glue).
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.stripe.com https://js.stripe.com https://va.vercel-scripts.com https://cdn.jsdelivr.net",
  // Tailwind inline + estilos de FullCalendar/recharts.
  "style-src 'self' 'unsafe-inline'",
  // Logos, avatares, imágenes de producto vía Supabase Storage + data: para inline SVG/blobs (OCR).
  "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
  // Tesseract.js / FullCalendar / dnd-kit / Recharts no usan workers externos, pero blob: necesario para Tesseract WASM.
  "worker-src 'self' blob:",
  "font-src 'self' data:",
  // Supabase REST + Realtime + Stripe + Google APIs.
  // tesseract.js descarga el worker desde jsDelivr y los modelos `*.traineddata.gz` desde tessdata.projectnaptha.com.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.stripe.com https://api.stripe.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com",
  // Stripe Checkout / Customer Portal abren ventanas e iframes.
  "frame-src https://*.stripe.com https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  // 'export' permite empaquetar como SPA estática para Capacitor (móvil) — coste 0€.
  output: isExport ? "export" : undefined,
  images: { unoptimized: true },
  reactStrictMode: true,
  // headers() es ignorado en modo `output: export` (Capacitor); en SSR aplica a todas las rutas.
  ...(isExport
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: SECURITY_HEADERS,
            },
          ];
        },
      }),
};

export default nextConfig;
