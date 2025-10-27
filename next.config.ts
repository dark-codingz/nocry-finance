import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Habilitar source maps para debug em produção
  productionBrowserSourceMaps: true,
  
  // Output standalone para melhor compatibilidade no Vercel
  output: "standalone",
};

export default nextConfig;
