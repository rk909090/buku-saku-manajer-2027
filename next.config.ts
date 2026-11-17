import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Tailwind diproses lewat postcss.config.mjs. Build produksi memakai webpack
  // (`next build --webpack`) karena Turbopack gagal membuat proses Node untuk
  // loader CSS di server build Hostinger.
  images: {
    // 85 dipakai jendela pembesar foto halaman buku agar teks tetap tajam; 75 = default.
    qualities: [75, 85],
  },
  experimental: {
    // Server build Hostinger melaporkan puluhan CPU (49–56) sehingga Next membuat sebanyak itu worker;
    // pada 17 Nov 2026 salah satu build gagal dengan worker SIGABRT. Batasi agar memori cukup.
    cpus: 4,
  },
};

export default nextConfig;
