import Link from "next/link";
import Image from "next/image";
import { Brain, ChartNoAxesCombined, FileCodeCorner, Scale } from 'lucide-react';

const MEMBERS = [
  {
    name: "Muhammad Muflih Affandi",
    role: "Data Architect",
    email: "affanart645@gmail.com",
    linkedin: "muhmaffandi",
    github: "MuhammadAffandi24",
    isLeader: true,
    profilePicture: "/apanjempol.jpeg"
  },
  {
    name: "Muhammad Althafino",
    role: "Full Stack Developer",
    email: "malthafino36@gmail.com",
    linkedin: "althafino",
    github: "ZerefAintDie",
    isLeader: false,
    profilePicture: "/pino.jpeg"
  },
  {
    name: "Farhan Wegig Pramudito",
    role: "AI Engineer",
    email: "tios00123@gmail.com",
    linkedin: "farhan-wegig-pramudito-90499a346",
    github: "FarhanWegigP",
    isLeader: false,
    profilePicture: "/tio.jpeg"
  },
  {
    name: "Vriska Diah Novita Sari",
    role: "UI/UX",
    email: "vriskadiahnovitasari@gmail.com",
    linkedin: "vriskadiahns",
    github: "Vriskadiahns",
    isLeader: false,
    profilePicture: "/vriskajempol.jpeg"
  },
  {
    name: "Berliana Syifa Maharani",
    role: "Data Annotation",
    email: "berlianasyifa9@gmail.com",
    linkedin: "berliana-syifa-maharani",
    github: "Berlianaa27",
    isLeader: false,
    profilePicture: "/berli.jpeg"
  },
  {
    name: "Risquina Angelica Arvintyani",
    role: "Data Preparation",
    email: "risquinaangelicaa@gmail.com",
    linkedin: "risquina-angelica-arvintyani",
    github: "Risquinaangelica",
    isLeader: false,
    profilePicture: "/angeljempol.jpeg"
  },
  {
    name: "Regina Aurellia Tsaqif",
    role: "Business Analyst",
    email: "reginaaurelliaa@gmail.com",
    linkedin: "reginaaurelliatsaqif",
    github: "regiregina",
    isLeader: false,
    profilePicture: "/regina.jpeg"
  },
];

const AVATAR_COLORS = [
  "from-[#0C81E4] to-[#0C4E8C]",
  "from-[#11C4D4] to-[#0C81E4]",
  "from-[#4FE7AF] to-[#11C4D4]",
  "from-[#0C4E8C] to-[#11C4D4]",
  "from-[#0C81E4] to-[#4FE7AF]",
  "from-[#11C4D4] to-[#0C81E4]",
  "from-[#4FE7AF] to-[#0C81E4]",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase text-(--pajak-primary)">
      <span className="w-6 h-px bg-(--pajak-primary)" />
      {children}
    </p>
  );
}

function IconEmail() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function IconGithub() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.78 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.27 5.68.41.35.78 1.04.78 2.1v3.11c0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12c0-6.27-5.23-11.5-11.5-11.5z" />
    </svg>
  );
}

function MemberCard({
  member,
  index,
  size = "normal",
}: {
  member: (typeof MEMBERS)[0];
  index: number;
  size?: "normal" | "large";
}) {
  const isLarge = size === "large";
  return (
    <div
      className={`group relative bg-white rounded-2xl border border-[var(--pajak-border)] shadow-[0_1px_2px_rgba(12,78,140,0.04)] hover:shadow-[0_12px_32px_-12px_rgba(12,78,140,0.25)] hover:border-[var(--pajak-primary)] hover:-translate-y-0.5 transition-all duration-300 ${
        isLarge ? "p-8 flex flex-col items-center text-center" : "p-5 flex items-start gap-4"
      }`}
    >
      {isLarge && (
        <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-[var(--pajak-base)] text-white text-[10px] font-bold tracking-wider uppercase">
          Lead
        </span>
      )}

      {/* Avatar Container dengan Logika Foto Profil */}
      <div
        className={`relative overflow-hidden bg-white rounded-full border border-[var(--pajak-border)] shadow-[0_1px_2px_rgba(12,78,140,0.04)] p-8 flex flex-col items-center text-center hover:shadow-[0_16px_40px_-16px_rgba(12,78,140,0.3)] hover:border-[var(--pajak-primary)] hover:-translate-y-1 transition-all duration-300 overflow-hidden ring-4 ring-white shadow-lg ${
          isLarge ? "w-24 h-24 text-3xl mb-4" : "w-14 h-14 text-lg"
        }`}
      >
        {member.profilePicture ? (
          <Image
            src={member.profilePicture}
            alt={member.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 96px"
          />
        ) : (
          getInitials(member.name)
        )}
      </div>

      <div className={`min-w-0 ${isLarge ? "w-full" : "flex-1"}`}>
        <h3
          className={`font-title tracking-wide text-[var(--pajak-base)] leading-tight ${
            isLarge ? "text-2xl mb-1.5" : "text-base mb-0.5 font-semibold"
          }`}
        >
          {member.name}
        </h3>
        <span
          className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold mb-3 ${
            member.isLeader
              ? "bg-[var(--pajak-base)] text-white"
              : "bg-[var(--pajak-tertiary)]/20 text-[var(--pajak-base)]"
          }`}
        >
          {member.role}
        </span>

        <div className={`flex flex-col gap-1.5 text-xs text-gray-500 ${isLarge ? "items-center" : ""}`}>
          <a
            href={`mailto:${member.email}`}
            className="flex items-center gap-1.5 hover:text-[var(--pajak-primary)] transition-colors truncate max-w-full"
          >
            <IconEmail />
            <span className="truncate">{member.email}</span>
          </a>
          <a
            href={`https://linkedin.com/in/${member.linkedin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-[var(--pajak-primary)] transition-colors"
          >
            <IconLinkedIn />
            <span>linkedin.com/in/{member.linkedin.length > 16 ? member.linkedin.slice(0, 16) + "…" : member.linkedin}</span>
          </a>
          <a
            href={`https://github.com/${member.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-[var(--pajak-primary)] transition-colors"
          >
            <IconGithub />
            <span>github.com/{member.github}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const leader = MEMBERS.find((m) => m.isLeader)!;
  const rest = MEMBERS.filter((m) => !m.isLeader);

  return (
    <div className="min-h-full bg-[var(--pajak-light)]">
      {/* ── 1. HERO ────────────────────────────────────────────────────── */}
      <section className="relative bg-[var(--pajak-base)] overflow-hidden">
        <div className="absolute -top-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-[var(--pajak-primary)] opacity-25 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-[22rem] h-[22rem] rounded-full bg-[var(--pajak-secondary)] opacity-20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6 py-28 text-center text-white">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold tracking-widest uppercase text-[var(--pajak-secondary)] mb-5 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--pajak-secondary)]" />
            HIBAH MBKM UNS 2026  
          </span>
          <h1 className="font-title text-5xl md:text-7xl mb-6 leading-[1.05] tracking-tight">
            Tentang Kami
          </h1>
          <p className="text-lg md:text-xl text-blue-100/90 max-w-2xl mx-auto leading-relaxed">
            Pelajari lebih lanjut mengenai latar belakang proyek ini, program yang mendasarinya, serta tim yang mengembangkan sistem analitik putusan pajak ini.
          </p>
        </div>
      </section>

      {/* ── 2. MBKM SECTION ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <Eyebrow>Program Kami</Eyebrow>
            <h2 className="font-title text-4xl md:text-5xl text-[var(--pajak-base)] mt-4 mb-6 leading-tight tracking-tight">
              Program Magang Berdampak
            </h2>
            <div className="border-l-4 text-justify border-[var(--pajak-primary)] pl-5">
              <p className="text-gray-600 leading-relaxed text-[15px]">
                Kegiatan Hibah MBKM UNS adalah program pendanaan yang
                diselenggarakan oleh Universitas Sebelas Maret (UNS) untuk
                mendukung pelaksanaan Merdeka Belajar–Kampus Merdeka (MBKM) di
                tingkat universitas, fakultas, maupun program studi.
              </p>
              <p className="text-gray-600 leading-relaxed text-[15px] mt-4">
                Program ini bertujuan mendorong inovasi pembelajaran, kolaborasi
                dengan mitra eksternal, serta peningkatan kompetensi mahasiswa
                agar lebih siap menghadapi dunia kerja dan kebutuhan masyarakat.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: "🎓", label: "Inovasi Pembelajaran" },
              { icon: "🤝", label: "Kolaborasi Mitra" },
              { icon: "💡", label: "Kompetensi Mahasiswa" },
              { icon: "🌍", label: "Dampak Masyarakat" },
            ].map((item, i) => (
              <div
                key={item.label}
                className={`group bg-white rounded-2xl border border-[var(--pajak-border)] p-6 flex flex-col items-center text-center gap-3 shadow-[0_1px_2px_rgba(12,78,140,0.04)] hover:shadow-[0_12px_32px_-12px_rgba(12,78,140,0.2)] hover:border-[var(--pajak-primary)] hover:-translate-y-1 transition-all duration-300 ${
                  i % 2 === 1 ? "md:translate-y-6" : ""
                }`}
              >
                <span className="text-4xl transition-transform duration-300 group-hover:scale-110">
                  {item.icon}
                </span>
                <span className="text-sm font-semibold text-[var(--pajak-base)]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. ALPHA PROJECT ───────────────────────────────────────────── */}
      <section className="bg-white border-y border-[var(--pajak-border)]">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-gradient-to-br from-[var(--pajak-base)] via-[#0a3f75] to-[var(--pajak-primary)] rounded-3xl p-10 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-[var(--pajak-primary)] opacity-30 blur-3xl -translate-y-10 translate-x-10" />
                <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-[var(--pajak-secondary)] opacity-20 blur-3xl translate-y-8 -translate-x-8" />
                <div
                  className="absolute inset-0 opacity-[0.08]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                  }}
                />
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-sm text-3xl mb-5">
                    <Scale className="w-8 h-8"/>
                  </div>
                  <h3 className="font-title text-3xl mb-3 tracking-tight">Alpha Project</h3>
                  <p className="text-blue-100/90 text-[15px] leading-relaxed">
                    Sistem analitik berbasis NLP & Data Science untuk putusan
                    pajak Indonesia.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-2">
                    {["NLP", "Data Science", "MHCorp"].map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <Eyebrow>Proyek Kami</Eyebrow>
              <h2 className="font-title text-4xl md:text-5xl text-[var(--pajak-base)] mt-4 mb-6 leading-tight tracking-tight">
                Alpha Project
              </h2>
              <div className="border-l-4 border-[var(--pajak-secondary)] pl-5 space-y-4 text-justify">
                <p className="text-gray-600 leading-relaxed text-[15px]">
                  Dalam program MBKM di MHCorp, Alpha Project
                  mengembangkan sistem analitik untuk mengolah dokumen putusan
                  pajak yang panjang dan rumit menjadi data yang lebih ringkas
                  dan terstruktur.
                </p>
                <p className="text-gray-600 leading-relaxed text-[15px]">
                  Dengan memanfaatkan Data Science dan NLP, sistem ini secara
                  otomatis mengekstrak inti sengketa dan pertimbangan hakim,
                  sehingga membantu tim KAP menyusun strategi hukum dengan lebih
                  cepat, tepat, dan berbasis data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. MHCORP / STATS ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <div className="flex justify-center"><Eyebrow>Pengguna Kami</Eyebrow></div>
          <h2 className="font-title text-4xl md:text-5xl text-[var(--pajak-base)] mt-4 mb-4 leading-tight tracking-tight">
            Digunakan oleh MHCORP
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-[15px] leading-relaxed">
            Sistem ini dirancang untuk membantu tim MHCORP dalam memudahkan
            pencarian dan analisis putusan pajak secara cepat dan akurat.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {[
            { value: "NLP", label: "Teknologi Utama", icon: <Brain className="w-18 h-18"></Brain> },
            { value: "Scraping", label: "Pengumpulan Data", icon: <FileCodeCorner className="w-18 h-18"/> },
            { value: "Akurat", label: "Berbasis Data", icon: <ChartNoAxesCombined className="w-18 h-18"/> },
          ].map((stat) => (
            <div
              key={stat.label}
              className="group relative bg-white rounded-2xl border border-[var(--pajak-border)] shadow-[0_1px_2px_rgba(12,78,140,0.04)] p-8 flex flex-col items-center text-center hover:shadow-[0_16px_40px_-16px_rgba(12,78,140,0.3)] hover:border-[var(--pajak-primary)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-gradient-to-br from-[var(--pajak-secondary)]/20 to-[var(--pajak-primary)]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative text-5xl mb-4 transition-transform duration-300 group-hover:scale-110">
                {stat.icon}
              </span>
              <span className="relative font-title text-3xl text-[var(--pajak-base)] mb-1 tracking-tight">
                {stat.value}
              </span>
              <span className="relative text-xs text-gray-500 uppercase tracking-[0.15em] font-medium">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        <div className="relative bg-gradient-to-r from-[var(--pajak-base)] via-[#0b4583] to-[var(--pajak-primary)] rounded-3xl p-10 md:p-14 text-white flex flex-col md:flex-row items-center gap-10 overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[var(--pajak-secondary)] opacity-20 blur-3xl -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-[var(--pajak-tertiary)] opacity-20 blur-3xl translate-y-10 -translate-x-10" />

          <div className="relative shrink-0 w-fit bg-white/15 border border-white/20 backdrop-blur-sm flex items-center justify-center text-5xl font-bold font-title shadow-lg overflow-hidden">
            <Image
              src="/mhcorp.png"
              width={300}
              height={300}
              alt="MHCorp"
              className="object-contain"
            />
          </div>
          <div className="relative">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] font-bold tracking-widest uppercase text-[var(--pajak-secondary)] mb-3">
              Partner
            </span>
            <h3 className="font-title text-3xl md:text-4xl mb-3 tracking-tight">MHCORP</h3>
            <p className="text-blue-100/90 leading-relaxed max-w-2xl text-[15px]">
              Sistem Alpha Project digunakan oleh MHCORP untuk mempercepat
              proses analisis putusan pajak. Dengan kemampuan pencarian
              cerdas berbasis NLP, tim dapat menemukan preseden hukum yang
              relevan dalam hitungan detik.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. TEAM ────────────────────────────────────────────────────── */}
      <section className="bg-white border-t border-[var(--pajak-border)]">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <div className="flex justify-center"><Eyebrow>Profil Kami</Eyebrow></div>
            <h2 className="font-title text-4xl md:text-5xl text-[var(--pajak-base)] mt-4 mb-4 leading-tight tracking-tight">
              Tim Alpha Project
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-[15px] leading-relaxed">
              Tujuh mahasiswa UNS yang berkolaborasi untuk membangun sistem
              analitik putusan pajak bersama MHCorp.
            </p>
          </div>

          <div className="max-w-md mx-auto mb-8">
            <MemberCard member={leader} index={0} size="large" />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {rest.map((member, i) => (
              <MemberCard key={member.name} member={member} index={i + 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. CTA ─────────────────────────────────────────────────────── */}
      <section className="relative bg-[var(--pajak-base)] overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[var(--pajak-primary)] opacity-25 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[var(--pajak-secondary)] opacity-20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center text-white">
          <h2 className="font-title text-4xl md:text-5xl mb-4 leading-tight tracking-0.5">
            Mulai Eksplorasi Putusan Pajak
          </h2>
          <p className="text-blue-100/80 mb-10 text-[15px] max-w-xl mx-auto leading-relaxed">
            Gunakan sistem kami untuk menemukan dan menganalisis putusan pajak
            dengan lebih cepat dan berbasis data.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/dashboard"
              className="group px-8 py-3.5 bg-[var(--pajak-primary)] hover:bg-[#0a6bc4] text-white font-semibold rounded-xl transition-all duration-200 text-sm shadow-lg shadow-[var(--pajak-primary)]/30 hover:shadow-xl hover:shadow-[var(--pajak-primary)]/40 hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              Lihat Dashboard
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/app"
              className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/30 backdrop-blur-sm transition-all duration-200 text-sm hover:-translate-y-0.5"
            >
              Coba AI Konsultan
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}