import { MARKETPLACES, aboutBook, chapters, faqs, readers } from "@/lib/content";
import { AUTHOR, BOOK_FACTS, ORGANIZATION, SEO_DESCRIPTION, SITE_URL } from "@/lib/seo";

/**
 * /llms.txt — ringkasan faktual untuk mesin jawaban & LLM (format llmstxt.org).
 * Dibangun dari sumber yang sama dengan halaman (src/lib/content.ts & seo.ts).
 */
const plain = (s: string) =>
  s.replace(/_\*\*|\*\*_|\*\*/g, "").replace(/(^|[\s(“‘])_|_(?=[\s.,)”’]|$)/g, "$1");

function build() {
  const lines: string[] = [];
  lines.push("# Buku Saku Manajer — Edisi Kedua", "");
  lines.push(`> ${SEO_DESCRIPTION}`, "");
  lines.push(aboutBook.lead, "");

  lines.push("## Fakta buku", "");
  for (const f of BOOK_FACTS) lines.push(`- ${f.label}: ${f.value}`);
  lines.push("");

  lines.push("## Isi (6 bab)", "");
  for (const ch of chapters) {
    lines.push(`### ${ch.no}: ${ch.title}`, "");
    lines.push(`Masalah yang sering terjadi: ${ch.problem}`, "");
    for (const t of ch.topics) lines.push(`- ${t.title}: ${plain(t.text)}`);
    lines.push("");
  }

  lines.push("## Untuk siapa", "");
  for (const g of readers.groups) lines.push(`- ${g.level} (${g.role}): ${g.text}`);
  lines.push("");

  lines.push("## Penulis", "");
  lines.push(`- ${AUTHOR.name} — ${AUTHOR.jobTitle}.`);
  lines.push(`- ${AUTHOR.description}`);
  lines.push(`- ${AUTHOR.award}.`);
  lines.push("");

  lines.push("## Penerbit", "");
  lines.push(`- ${ORGANIZATION.legalName}, ${ORGANIZATION.streetAddress}, ${ORGANIZATION.addressLocality} ${ORGANIZATION.postalCode}.`);
  lines.push(`- ${ORGANIZATION.description}`);
  lines.push(`- Situs: ${ORGANIZATION.url}`);
  lines.push("");

  lines.push("## Tanya jawab", "");
  for (const f of faqs) lines.push(`- ${f.q} ${plain(f.a)}`);
  lines.push("");

  lines.push("## Tautan", "");
  lines.push(`- [Halaman buku](${SITE_URL}/)`);
  for (const m of Object.values(MARKETPLACES)) lines.push(`- [Beli di ${m.name}](${m.url})`);
  lines.push("");
  return lines.join("\n");
}

export function GET() {
  return new Response(build(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
