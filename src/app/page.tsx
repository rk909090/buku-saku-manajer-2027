import { LandingPage } from "@/components/landing-page";
import { controlVariant } from "@/lib/content";

/**
 * Cadangan: dalam kondisi normal "/" di-rewrite oleh src/proxy.ts ke /v/[varian].
 * Halaman ini hanya tampil bila proxy tidak berjalan (mis. ekspor statis), dan
 * memakai headline kontrol (varian A).
 */
export default function Home() {
  return <LandingPage variant={controlVariant} />;
}
