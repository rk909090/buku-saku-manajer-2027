import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Tailwind diproses lewat postcss.config.mjs. Build produksi memakai webpack
  // (`next build --webpack`) karena Turbopack gagal membuat proses Node untuk
  // loader CSS di server build Hostinger.
};

export default nextConfig;
