import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

/** Gambar pratinjau saat link dibagikan (WhatsApp, Facebook, X, LinkedIn, dll.). Dibuat saat build. */
export const alt = "Buku Saku Manajer Edisi Kedua karya Armala — Human Plus Institute";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const cover = await readFile(join(process.cwd(), "public/images/bsm-cover.png"), "base64");
const coverSrc = `data:image/png;base64,${cover}`;

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
          background: "linear-gradient(135deg, #070f1d 0%, #132445 60%, #1d3360 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div style={{ display: "flex", fontSize: 26, color: "#f0d08c", letterSpacing: 2 }}>
            EDISI KEDUA · ARMALA
          </div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05, marginTop: 18 }}>
            Buku Saku Manajer
          </div>
          <div style={{ display: "flex", fontSize: 32, lineHeight: 1.35, marginTop: 24, color: "#dfe5ef" }}>
            Panduan praktis 6 bab untuk Supervisor, Manager, Direktur &amp; Business Owner
          </div>
          <div style={{ display: "flex", marginTop: 36, fontSize: 28, color: "#e5bb63" }}>
            Human Plus Institute · Tersedia di Shopee &amp; Tokopedia
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) butuh <img> */}
        <img src={coverSrc} height={540} alt="" style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size }
  );
}
