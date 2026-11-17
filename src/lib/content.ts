/**
 * Semua copywriting di file ini diambil apa adanya dari dua halaman resmi
 * (diambil 17 Nov 2026):
 *   [S1] https://shop.humplus.com/bsm/
 *   [S2] https://humanplusinstitute.myscalev.com/bukusakumanajer
 * Pembelian: keranjang & checkout situs sendiri (lihat src/lib/shop & /checkout).
 * Penanda emphasis mengikuti markup sumber:
 *   **teks**   = <strong>
 *   _teks_     = <em>
 *   _**teks**_ = <em><strong>
 */

/**
 * Sejak 17 Nov 2026 pembelian melalui keranjang & checkout situs sendiri (ongkir Biteship,
 * pembayaran Xendit). Link marketplace lama disimpan untuk referensi, tidak lagi dipakai di halaman.
 */
export const LEGACY_MARKETPLACES = {
  shopee: "https://shopee.co.id/Buku-Saku-Manajer-Edisi-Kedua-Buku-Manajemen-SDM-Cara-Menjadi-Manajer-Yang-Hebat-i.398813280.17992548335",
  tokopedia: "https://www.tokopedia.com/humplusstore/buku-saku-manajer-edisi-kedua-terbaru",
} as const;

/**
 * Tautan WhatsApp CADANGAN (nomor dari [S1]). Nomor aktif diatur admin di Dashboard → Pengaturan dan
 * dibaca lewat getSettings()/getPublicContact(); ini hanya dipakai bila database tidak tersedia.
 */
export const WHATSAPP_URL = "https://wa.me/6287840848566";

export const price = "Rp120.000";
export const priceNote = "Belum termasuk ongkos kirim";

/** Label tombol beli. */
export const cta = {
  main: "Beli Sekarang",
  short: "Beli",
};

/* ───────────── HERO ───────────── */
export const hero = {
  tag: "Edisi Kedua · Panduan Praktis Kepemimpinan & Manajemen", // [S2]
  badge: "Best Seller!", // [S1]
  lead: "Dari mengarahkan operasional harian sebagai Supervisor, menyelaraskan target tim sebagai Manager, hingga menjaga arah bisnis sebagai Direktur—temukan panduan praktis yang langsung bisa diterapkan di meja kerja Anda.", // [S2]
};

/* ───────────── A/B TEST HEADLINE HERO ─────────────
 * Hanya kicker + H1 yang berbeda antar-varian; badge, lead, harga, dan CTA
 * sama persis supaya perbedaan performa bisa dikaitkan ke headline.
 * A = kontrol (teks sumber apa adanya). B & C = ditulis ulang dari materi
 * sumber, tanpa klaim baru — lihat `basis` tiap varian.
 * ID varian harus sama dengan AB_VARIANTS di src/lib/ab-config.ts.
 */
export type HeadlineVariant = {
  id: "a" | "b" | "c";
  name: string;
  hypothesis: string;
  basis: string;
  kicker: string;
  headline: [string, string];
};

export const headlineVariants: HeadlineVariant[] = [
  {
    id: "a",
    name: "Kontrol — peran manajer",
    hypothesis: "Pembingkaian peran secara umum, cocok untuk semua level jabatan.",
    basis: "Kicker dari shop.humplus.com/bsm, H1 dari halaman Scalev (apa adanya).",
    kicker: "Ingin Jadi Manajer Hebat Dalam Waktu Singkat?",
    headline: ["Jadi Manajer Bukan Sekadar Mengatur Pekerjaan.", "Tapi Memastikan Tim dan Bisnis Bergerak ke Tujuan."],
  },
  {
    id: "b",
    name: "Identitas — jebakan “super-operator”",
    hypothesis:
      "Pembaca yang mengenali dirinya (baru naik jabatan, masih mengerjakan semuanya sendiri) lebih terdorong membeli.",
    basis:
      "Istilah “super-operator” & pelaksana terbaik yang dipromosikan (shop.humplus.com/bsm); BAB 1 “Menggeser pola pikir dari pelaksana teknis menjadi penggerak tim” (Scalev).",
    kicker: "Untuk Supervisor, Manager, Direktur & Business Owner",
    headline: ["Naik Jabatan, Tapi Masih Mengerjakan Semuanya Sendiri?", "Berhenti Jadi “Super-Operator”. Mulai Gerakkan Tim."],
  },
  {
    id: "c",
    name: "Masalah → hasil konkret",
    hypothesis: "Masalah operasional yang spesifik dan terasa sehari-hari lebih kuat daripada pembingkaian peran.",
    basis:
      "Masalah BAB 2 “Tim terlihat sibuk… target bulanan tetap meleset” dan solusi BAB 3 “tanpa harus melakukan micromanaging” (Scalev).",
    kicker: "Buku Saku Manajer Edisi Kedua · 6 Bab Panduan Praktis",
    headline: ["Tim Sibuk Seharian, Tapi Target Tetap Meleset?", "Kendalikan Eksekusi Tim Tanpa Micromanaging."],
  },
];

export const controlVariant = headlineVariants[0];

export function getHeadlineVariant(id: string | undefined): HeadlineVariant | undefined {
  return headlineVariants.find((v) => v.id === id);
}

/* ───────────── REALITA [S2] ───────────── */
export const reality = {
  eyebrow: "Realita di Lapangan",
  heading: "Posisi Naik, Tanggung Jawab Berubah. Tapi Jarang Ada Panduan Praktis untuk Menjalankannya.",
  lead: "Anda dipercaya memegang jabatan karena rekam jejak kerja Anda. Namun begitu duduk di kursi pimpinan, tantangannya berubah total—apa pun level Anda saat ini:",
  levels: [
    {
      level: "Manajer Lini Pertama",
      role: "Supervisor / Team Leader",
      text: "Kemarin masih rekan satu tim, hari ini harus membagi tugas, menegur tanpa memicu konflik, dan memastikan pekerjaan selesai tepat waktu.",
    },
    {
      level: "Manajer Madya",
      role: "Department / Unit Manager",
      text: "Terjepit antara target manajemen dan ritme tim di lapangan. Sering kali tugas sudah dibagi, tetapi semua keputusan kecil tetap menumpuk di meja Anda.",
    },
    {
      level: "Manajer Puncak",
      role: "Direktur / Business Owner",
      text: "Sibuk memadamkan masalah operasional harian karena sistem kontrol dan delegasi di lapisan manajer bawahnya belum berjalan mandiri.",
    },
  ],
  closing:
    "Keahlian teknis saja tidak cukup untuk menjawab situasi ini. Anda membutuhkan rujukan praktis yang bisa dibuka kapan saja saat menghadapi kebuntuan di kantor.",
};

/* ───────────── CERITA [S1] ───────────── */
export const storyIntro = [
  "Banyak perusahaan yang memilih manajer nya dengan cara promosi dari dalam. Biasanya mereka adalah _**‘pelaksana terbaik’**_ di perusahaan. Sering kali penilaiannya didasarkan pada seberapa baik kinerja pelaksana tersebut pada posisinya saat ini, bukan pada potensi kemampuannya sebagai manajer. Mereka berasumsi bahwa seseorang yang pernah menunjukan kesuksesan di masa lalu merupakan indikator yang menentukan kesuksesannya di masa depan. Padahal kenyataannya tidak demikian. Seorang pelaksana terbaik tidak akan serta merta bisa menjadi manajer yang baik, karena keterampilan yang diperlukan bagi seorang manajer sangat berbeda dengan keterampilan yang diperlukan bagi seorang pelaksana.",
  "Selain keterampilan teknis yang dikuasai oleh pelaksana, faktor lain yang sering digunakan untuk mempromosikan seseorang menjadi manajer adalah alasan kesetiaan, kejujuran dan atau pengabdiannya kepada perusahaan. Hubungan kekerabatan atau pertemanan dengan pimpinan perusahaan, juga alasan lain yang sering menjadi pertimbangan promosi.",
  "Sebenarnya tidak ada yang salah dengan promosi seperti itu, asalkan mereka diberi bekal keterampilan manajerial dan kepemimpinan yang memadai, sehingga mereka mampu menjalankan peran barunya dengan baik. Sayangnya, banyak perusahaan yang tidak memberikan pelatihan yang memadai untuk para manajer yang baru diangkatnya. Alih-alih dilatih melalui sebuah program pengembangan manajemen terpadu, perusahaan lebih sering menggunakan metode _**“ceburkan ke kolam”**_ untuk melihat kemampuan mereka.",
  "Metode ini akan memaksa para manajer yang baru diangkat untuk _**“berenang atau tenggelam”**_. Pendekatan ini mengasumsikan bahwa setiap orang secara alami mengetahui bagaimana caranya _“berenang”_ atau dengan kata lain seorang pelaksana yang dicemplungkan menjadi manajer dianggap punya kemampuan alami untuk mengelola suatu departemen atau bagian tertentu. Padahal tentu saja mereka tidak punya kemampuan tersebut, karena **keterampilan manajerial itu bukan bakat yang dibawa sejak lahir**, melainkan **perlu dipelajari dan dilatih** terlebih dahulu.",
];

export const storyBridge =
  "Tak heran bila kemudian banyak manajer yang tidak mampu menjalankan tugas pokok, fungsi, peran dan tanggung jawabnya dengan baik.";

/** Tiga paragraf kasus dari [S1]; `role` & `nickname` = kata yang ditebalkan di sumber. */
export const roleCases = [
  {
    role: "Supervisor",
    nickname: "“super-operator”",
    text: "Posisinya **supervisor**, namun dalam aktivitas sehari-hari tidak menjalankan fungsi **“pengawasan”** sebagaimana tupoksi utamanya. Ia malah sering terlibat dalam masalah-masalah teknis, sehingga menjadi orang yang paling sibuk diantara semua pelaksana yang ada. Karena itu mereka lebih tepat disebut sebagai **“super-operator”** daripada sebagai “manajer”.",
  },
  {
    role: "Manajer",
    nickname: "“pemadam kebakaran“",
    text: "Jabatannya **manajer**, namun ia tidak menjalankan fungsi **“pengelolaan”** untuk membuat keteraturan dalam organisasi yang dipimpinnya. Ia sering terlibat dalam urusan teknis operasional untuk mengatasi masalah-masalah yang terjadi. Mereka tak ubahnya seperti petugas **“pemadam kebakaran“** yang sibuk memadamkan api, dan baru bekerja bila terjadi kebakaran.",
  },
  {
    role: "CEO",
    nickname: "“chief everythings officer”",
    text: "Jabatannya **CEO**, namun ia sering turun terlalu ke bawah mengambil alih pekerjaan manajer atau bahkan melakukan pekerjaan yang seharusnya dilakukan oleh manajer. Tak jarang pula ia merangkap semua fungsi manajer—mulai dari manajer lini pertama hingga manajer puncak—dalam organisasi yang dipimpinnya, sehinga lebih tepat disebut sebagai _**“chief everythings officer”**_.",
  },
];

export const storyOutro = [
  "Idealnya setiap perusahaan memiliki program pelatihan manajemen dan kepemimpinan yang terintegrasi, sayangnya tidak demikian. Karena itu, setiap manajer dan calon manajer yang sungguh-sungguh ingin menjadi manajer profesional, harus belajar secara mandiri.",
  "Penulis buku ini, saat pertama kali menjadi manajer mengalami hal yang sama. Ia berharap perusahaan multinasional yang baru merekrutnya menjadi supervisor, memiliki _Supervisory Development Program_ yang akan mengajari dan melatih bagaimana caranya untuk menjadi seorang supervisor yang baik, bagaimana cara menjalankan peran sebagai manajer, dan bagaimana cara melatih berbagai keterampilan manajerial yang diperlukan. Kenyataannya tidak demikian, sehingga ia terpaksa belajar secara mandiri. Memelajari keterampilan manajerial dengan caranya sendiri; yang tentu saja efektivitasnya belum teruji.",
];

export const storyPromise =
  "Buku ini dapat dijadikan pedoman untuk melatih keterampilan manajerial sehingga para manajer bisa menjalankan perannya secara efektif, sehingga dapat membantu menyelamatkan para manajer dan calon manajer dari pengulangan cara belajar yang mahal dan waktu yang lama.";

/* ───────────── APAKAH ANDA? [S1] ───────────── */
export const audience = {
  heading: "Apakah Anda?",
  points: [
    "Seorang direktur atau pemilik bisnis yang tidak tahu bagaimana cara mengukur kemampuan manajer dan supervisor.",
    "Seorang manajer yang memiliki pengetahuan manajemen, namun kesulitan dalam mempraktikannya.",
    "Manajer namun belum paham apa yang menjadi tugas pokok dan fungsi manajer, sehingga senantiasa menunggu arahan atau instruksi dari atasan.",
    "Manajer namun lebih banyak melakukan pekerjaan sendiri, karena kurang atau tidak memberdayakan anak buah.",
    "Manajer atau calon manajer yang ingin menguasai keterampilan manajerial.",
  ],
  verdict: "BUKU SAKU MANAJER COCOK UNTUK ANDA",
};

/* ───────────── KENALI BUKUNYA [S2] + keunggulan [S1] ───────────── */
export const aboutBook = {
  eyebrow: "Kenali Bukunya",
  heading: "Kenali Panduan Praktis untuk Menjalankan Peran Manajerial dengan Lebih Terarah.",
  lead: "Buku Saku Manajer Edisi Kedua membahas tugas pokok, fungsi, tanggung jawab, keterampilan, dan praktik manajerial bagi manajer dan supervisor.",
  features: [
    "Berdasarkan praktek terbaik manajemen (best practice management).",
    "Disusun secara terstruktur dan sistematis untuk memudahkan manajer memiliki kerangka berpikir yang baik.",
    "Menggunakan gaya bahasa yang ringan dan sederhana, sehingga \"renyah\" untuk dibaca.",
  ], // [S1]
};

/* ───────────── ISI 6 BAB [S2] ───────────── */
export const chaptersIntro = {
  eyebrow: "Isi Lengkap Buku Saku Manajer",
  heading: "Setiap Bab Disusun untuk Menjawab Masalah Nyata yang Anda Hadapi Setiap Hari.",
  lead: "Bukan teori manajemen yang berputar-putar. Lihat langsung bagaimana 6 bab di dalam buku ini memetakan tantangan Anda dari hari pertama memimpin hingga pengelolaan bisnis secara menyeluruh:",
  problemLabel: "Masalah yang sering terjadi",
  solutionLabel: "Materi solusi di dalam bab ini",
};

export const chapters = [
  {
    no: "BAB 1",
    title: "Memahami Peran Manajer",
    problem:
      "“Baru dipromosikan, tapi bingung harus mulai dari mana. Akhirnya malah kembali mengerjakan pekerjaan teknis sendiri karena merasa lebih cepat daripada mengarahkan tim.”",
    topics: [
      { title: "Pertama Kali Menjadi Manajer", text: "Menggeser pola pikir dari pelaksana teknis menjadi penggerak tim." },
      { title: "Menjadi Agen Perubahan", text: "Cara membangun ritme kerja baru tanpa memicu penolakan tim." },
      {
        title: "Tanggung Jawab & Tugas Dasar Manajer",
        text: "Batasan jelas antara pekerjaan yang harus Anda pegang sendiri dan yang harus dikelola lewat orang lain.",
      },
      {
        title: "Keterampilan yang Diperlukan Manajer & Apa yang Perlu Dilakukan",
        text: "Peta kompetensi inti untuk manajer lini pertama hingga pimpinan unit.",
      },
    ],
  },
  {
    no: "BAB 2",
    title: "Menetapkan Tujuan dan Perencanaan",
    problem:
      "“Tim terlihat sibuk dari pagi sampai sore, tetapi target bulanan tetap meleset karena arahan kerja terlalu abstrak dan tidak diterjemahkan menjadi langkah harian.”",
    topics: [
      {
        title: "Menentukan Goal (Sasaran & Target)",
        text: "Teknik merumuskan target tim yang terukur dan dipahami seluruh anggota.",
      },
      {
        title: "Membuat Perencanaan (Planning)",
        text: "Cara memecah target besar perusahaan menjadi rencana kerja mingguan dan harian yang realistis.",
      },
    ],
  },
  {
    no: "BAB 3",
    title: "Menjalankan dan Mengontrol Pekerjaan",
    problem:
      "“Hari Senin tim bilang siap, hari Jumat pekerjaan belum beres. Baru ketahuan macet saat tenggat waktu sudah lewat karena tidak ada mekanisme pantauan di tengah jalan.”",
    topics: [
      {
        title: "Melakukan Eksekusi",
        text: "Memastikan rencana kerja benar-benar bergerak di lapangan, bukan berhenti di ruang rapat.",
      },
      {
        title: "Melakukan Tinjauan & Sistem Kontrol",
        text: "Cara memantau progres tim secara berkala tanpa harus melakukan _micromanaging_ setiap jam.",
      },
      {
        title: "Melakukan Tindak Lanjut",
        text: "Langkah koreksi cepat sebelum masalah kecil berubah menjadi keterlambatan besar.",
      },
    ],
  },
  {
    no: "BAB 4",
    title: "Mengelola Tim dan Tanggung Jawab",
    problem:
      "“Sudah membagi tugas, tapi bawahan terus bertanya untuk setiap keputusan kecil. Di sisi lain, saat tim melakukan kesalahan, Anda serba salah menegur karena takut tim tersinggung atau demotivasi.”",
    topics: [
      {
        title: "Delegasi yang Efektif & Pembagian Tanggung Jawab",
        text: "Cara menyerahkan tugas beserta batas wewenangnya agar tim berani mengambil keputusan secara mandiri.",
      },
      {
        title: "Umpan Balik Positif & Umpan Balik Korektif",
        text: "Pola komunikasi objektif untuk mengapresiasi kinerja sekaligus meluruskan kesalahan.",
      },
      {
        title: "Teknik Menegur Bawahan",
        text: "Langkah praktis menegur anggota tim secara tegas, profesional, dan fokus pada perbaikan kerja—bukan menyerang pribadi.",
      },
    ],
  },
  {
    no: "BAB 5",
    title: "Menyelesaikan Masalah dan Mengukur Kinerja",
    problem:
      "“Penilaian kinerja terasa subjektif, masalah yang sama terus berulang setiap bulan, dan gesekan antaranggota tim mengganggu produktivitas kerja.”",
    topics: [
      {
        title: "Mengelola Konflik & Menyelesaikan Masalah",
        text: "Kerangka mencari akar masalah operasional dan meredam gesekan tim secara adil.",
      },
      {
        title: "Menyusun Laporan & Mengukur Kinerja",
        text: "Cara membaca indikator kinerja (KPI) sebagai alat evaluasi sistem kerja agar keputusan manajerial berbasis data, bukan asumsi.",
      },
    ],
  },
  {
    no: "BAB 6",
    title: "Kepemimpinan dan Pengelolaan Bisnis",
    problem:
      "“Operasional harian berjalan, tetapi pimpinan kesulitan melihat gambaran besar bisnis dan menyiapkan lapisan manajer di bawahnya agar organisasi bisa bertumbuh.”",
    topics: [
      {
        title: "Kepemimpinan",
        text: "Membangun wibawa, keteladanan, dan pengaruh yang membuat tim bergerak karena kesadaran, bukan sekadar paksaan jabatan.",
      },
      {
        title: "Management Business Assistance",
        text: "Panduan menyelaraskan pengelolaan tim dan operasional harian agar selaras dengan arah pertumbuhan bisnis secara menyeluruh.",
      },
    ],
  },
];

export const authorQuote = {
  quote:
    "“KPI bukanlah alat untuk menghukum karyawan yang tidak mencapai target, tetapi bagian dari sistem kendali manajemen untuk mengetahui bagian mana dari sistem yang tidak bekerja.”",
  cite: "— Armala, Penulis Buku Saku Manajer",
};

/* ───────────── REKOMENDASI PEMBACA [S2] ───────────── */
export const readers = {
  eyebrow: "Rekomendasi Pembaca",
  heading: "Dirancang untuk Setiap Lapisan Pengambil Keputusan di Organisasi Anda.",
  groups: [
    {
      level: "Manajer Lini Pertama",
      role: "Supervisor / Team Leader",
      text: "Bagi Anda yang baru naik jabatan dan membutuhkan pegangan praktis untuk membagi tugas, menegur tim, dan mengawal eksekusi harian.",
    },
    {
      level: "Manajer Madya",
      role: "Manager / Head of Department",
      text: "Bagi Anda yang mengelola target lintas fungsi, mengoordinasikan para supervisor, dan ingin tim bekerja mandiri tanpa bergantung pada instruksi mikro.",
    },
    {
      level: "Manajer Puncak",
      role: "Direktur / General Manager",
      text: "Bagi pimpinan yang membutuhkan rujukan standar manajerial untuk menyelaraskan kinerja seluruh divisi menuju sasaran perusahaan.",
    },
    {
      level: "Business Owner",
      role: "Pemilik usaha",
      text: "Bagi pemilik usaha yang ingin melepaskan diri dari jebakan operasional harian dengan membangun sistem pendelegasian dan kontrol tim yang rapi.",
    },
  ],
};

/* ───────────── HASIL [S1] ───────────── */
export const outcomes = {
  heading:
    "JADILAH MANAJER MUDA YANG PROFESIONAL - MENGUASAI SOFT SKILLS - KEMAMPUAN KONSEPTUAL DAN KEMAMPUAN TEKNIS TERBAIK !!!",
  points: [
    "Menjadi Agen Perubahan",
    "Menguasai ilmu praktis yang aplikatif",
    "Mengetahui tupoksi dengan benar",
    "Menguasai ilmu dan keterampilan manajerial dengan sangat baik",
    "Memiliki kemampuan komunikasi",
    "Mampu mengelola dan menyelesaikan konflik dengan solusi-solusi terbaik",
    "Memiliki kemampuan leadership yang mumpuni",
  ],
};

/* ───────────── PENULIS [S1] + [S2] ───────────── */
export const author = {
  eyebrow: "Penulis", // [S2]
  heading: "Siapa ARMALA?", // [S1]
  subheading: "Ditulis oleh Praktisi dan Konsultan Manajemen.", // [S2]
  points: [
    "Founder dan President **Human Plus Institute**.",
    "Orang Indonesia pertama yang mendapatkan sertifikat **MASTER PRODUCTIVITY SPECIALIST** dari APS (Association Productivity Specialist), USA.",
    "Telah melatih lebih dari **30.000** manajer di seluruh Indonesia melalui pelatihan How To Be The World Class Manager.",
    "Penulis buku - buku Best Seller : **The Manager**, **Buku Saku Manager**, **Menjadi Manajer itu Gampang**, **How To Be A Great Manager**.",
    "Telah mendampingi **ratusan** brand mulai dari UKM hingga Corporate melalui program Management Business Assistance.",
  ], // [S1]
  backCover: [
    "**Armala** adalah konsultan manajemen.",
    "Pada tahun 2018 meraih pengakuan internasional sebagai Master Productivity Specialist dari Association of Productivity Specialists (APS).",
    "Telah membimbing dan melatih ribuan supervisor, manajer, dan direktur di berbagai perusahaan serta bidang industri di tanah air dan beberapa negara Asia Pasifik.",
  ], // [S2]
  backCoverSource: "Sumber: keterangan penulis pada sampul belakang buku.", // [S2]
};

/* ───────────── HUMAN PLUS INSTITUTE [S2] ───────────── */
export const institute = {
  heading: "Change Your Future with Competency.",
  lead: "Human Plus Institute adalah perusahaan yang bergerak di bidang pengembangan manajemen sumber daya manusia dan konsultan manajemen. Agent of Change, Expert in System & People Development, dengan nilai Professional, Discipline, dan Integrity.",
  galleryNote: "Dokumentasi pelatihan Human Plus Institute. Geser atau ketuk panah untuk melihat foto lainnya.",
  /** alt = teks alt asli di [S2] */
  photos: [
    { src: "/images/pelatihan/01.webp", alt: "Pelatihan Human Plus Institute", w: 480, h: 320 },
    { src: "/images/pelatihan/02.webp", alt: "Sesi pelatihan di panggung", w: 480, h: 320 },
    { src: "/images/pelatihan/03.webp", alt: "Interaksi dengan peserta pelatihan", w: 480, h: 320 },
    { src: "/images/pelatihan/04.webp", alt: "Foto bersama peserta pelatihan", w: 480, h: 320 },
  ],
  gallery: [
    { src: "/images/pelatihan/05.webp", alt: "Peserta menyimak materi pelatihan", w: 440, h: 293 },
    { src: "/images/pelatihan/06.webp", alt: "Peserta mengikuti sesi pelatihan", w: 440, h: 293 },
    { src: "/images/pelatihan/07.webp", alt: "Peserta pelatihan dengan buku Buku Saku Manajer di rak belakang", w: 440, h: 293 },
    { src: "/images/pelatihan/08.webp", alt: "Peserta menunjukkan kartu testimonial pelatihan", w: 440, h: 293 },
    { src: "/images/pelatihan/09.webp", alt: "Diskusi antar peserta pelatihan", w: 440, h: 293 },
    { src: "/images/pelatihan/10.webp", alt: "Peserta bertanya dalam sesi pelatihan", w: 440, h: 247 },
    { src: "/images/pelatihan/11.webp", alt: "Peserta mencatat dan membaca modul pelatihan", w: 440, h: 293 },
    { src: "/images/pelatihan/12.webp", alt: "Peserta menyimak materi pelatihan", w: 440, h: 293 },
    { src: "/images/pelatihan/13.webp", alt: "Peserta menyimak materi pelatihan", w: 440, h: 247 },
    { src: "/images/pelatihan/14.webp", alt: "Suasana kelas pelatihan", w: 440, h: 293 },
  ],
};

/* ───────────── ULASAN [S2] ───────────── */
export const reviews = {
  heading: "Pengalaman Peserta Bersama Human Plus Institute",
  note: "Ulasan tentang pengalaman mengikuti pelatihan Human Plus Institute, bukan ulasan pembelian buku. Geser atau ketuk panah untuk melihat ulasan lainnya.",
  items: [
    { src: "/images/ulasan/01.webp", alt: "Ulasan Google Hadi Maryadi, bintang 5", w: 760, h: 392 },
    { src: "/images/ulasan/02.webp", alt: "Ulasan Google Andini Febriyani, bintang 5", w: 760, h: 413 },
    { src: "/images/ulasan/03.webp", alt: "Ulasan Google Aris Sudarmono, bintang 5", w: 760, h: 394 },
    { src: "/images/ulasan/04.webp", alt: "Ulasan Google Desalma Dina, bintang 5", w: 760, h: 420 },
    { src: "/images/ulasan/05.webp", alt: "Ulasan Google zulkifly par, bintang 5", w: 760, h: 343 },
    { src: "/images/ulasan/06.webp", alt: "Ulasan Google Nanina Kitchen, bintang 5", w: 760, h: 300 },
  ],
};

/* ───────────── PENAWARAN [S2] ───────────── */
export const offer = {
  title: "Buku Saku Manajer — Edisi Kedua",
  byline: "Armala · PT Human Plus Institute",
};

/* ───────────── FAQ [S2] ─────────────
 * - FAQ harga promo DISKON20 dihapus (pembelian kini lewat Shopee, tanpa promo).
 * - "Bagaimana cara membeli buku?" & "Bagaimana proses pengiriman?" ditulis ulang sesuai
 *   alur checkout situs (Biteship + Xendit); di sumber jawabannya masih "[ISI ADMIN]".
 */
export const faqHeading = "Pertanyaan yang Sering Diajukan";
export const faqs = [
  {
    q: "Buku Saku Manajer membahas tentang apa?",
    a: "Membahas panduan praktis tugas pokok, fungsi, tanggung jawab, dan keterampilan manajerial dalam 6 bab terstruktur: mulai dari transisi peran manajer baru, penetapan target dan perencanaan, sistem kontrol eksekusi, teknik delegasi dan menegur bawahan, pengukuran kinerja, hingga kepemimpinan bisnis.",
  },
  {
    q: "Siapa saja yang cocok membaca buku ini?",
    a: "Manajer lini pertama (Supervisor/Team Leader), manajer madya (Manager), manajer puncak (Direktur), serta Business Owner yang memiliki tanggung jawab mengelola tim dan operasional bisnis.",
  },
  {
    q: "Apakah buku ini cocok untuk first-time manager?",
    a: "Ya. Bab pertamanya, “Pertama Kali Menjadi Manajer”, disusun untuk memahami peran baru ini.",
  },
  {
    q: "Saya sudah cukup lama menjadi manajer, apakah buku ini masih relevan?",
    a: "Ya. Banyak manajer berpengalaman menggunakan buku ini sebagai rujukan cepat (_pocket guide_) untuk meninjau ulang sistem delegasi, memperbaiki cara memberi umpan balik korektif, serta menyamakan standar kerja para supervisor di bawahnya.",
  },
  {
    q: "Apakah buku ini membahas cara mengelola tim?",
    a: "Ya, antara lain delegasi, pembagian tanggung jawab, umpan balik positif dan korektif, teknik menegur bawahan, serta mengelola konflik.",
  },
  {
    q: "Apakah buku ini membahas perencanaan dan pengukuran kinerja?",
    a: "Ya. Ada bab khusus Membuat Perencanaan (Planning) dan Mengukur Kinerja.",
  },
  {
    q: "Bagaimana cara membeli buku?",
    a: "Klik tombol **Beli Sekarang**, isi data pemesan dan alamat pengiriman, pilih kurir, lalu bayar online di halaman pembayaran Xendit dengan metode yang tersedia di sana.",
  },
  {
    q: "Bagaimana proses pengiriman?",
    a: "Ongkos kirim dihitung otomatis saat checkout berdasarkan alamat tujuan dan kurir yang Anda pilih. Setelah pembayaran diterima, pesanan diproses dan nomor resi dapat dilihat di halaman status pesanan.",
  },
];

/* ───────────── PENUTUP [S2] ───────────── */
export const closing = {
  heading: "Mulai Kelola Pekerjaan, Tim, dan Bisnis dengan Lebih Terarah.",
  lead: "Bangun kompetensi manajerial melalui pemahaman tujuan, perencanaan, eksekusi, dan tinjauan.",
};

/* ───────────── FOOTER [S2] ───────────── */
export const company = {
  name: "PT Human Plus Institute",
  address: "Cyber 2 Tower, 18th Floor, Jl. H.R. Rasuna Said Blok X-5 Kav. 13, Jakarta 12950",
  phone: "Telp. (021) 781 2007 · Mobile 0811 199 395",
  links: [
    { label: "www.humanplus.co.id", href: "https://www.humanplus.co.id" },
    { label: "www.sekolahmanajer.co.id", href: "https://www.sekolahmanajer.co.id" },
    { label: "@humanplusinstitute", href: "https://www.instagram.com/humanplusinstitute" },
  ],
};
