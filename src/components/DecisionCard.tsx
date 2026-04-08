// src/components/DecisionCard.tsx
import React from "react";
import Link from "next/link";

interface DecisionCardProps {
  data: {
    id: number;
    nomor_putusan_pp?: string;
    nomor_putusan_pk?: string;
    pemohon?: string;
    termohon?: string;
    jenis_pajak?: string;
    amar_putusan?: string;
    upaya_hukum?: string;
    tanggal_putusan?: string;
    objek_sengketa?: string;
    preview_sengketa?: string;
  };
}

function getStatusStyle(status: string): string {
  const s = status?.toLowerCase() ?? "";
  if (s.includes("mengabulkan") && !s.includes("sebagian"))
    return "bg-green-100 text-green-700 border-green-200";
  if (s.includes("sebagian")) return "bg-orange-100 text-orange-600 border-orange-200";
  if (s.includes("menolak")) return "bg-red-100 text-red-600 border-red-200";
  if (s.includes("tidak dapat")) return "bg-gray-200 text-gray-700 border-gray-300";
  return "bg-gray-100 text-gray-500 border-gray-200";
}

export default function DecisionCard({ data }: DecisionCardProps) {
  const slug = encodeURIComponent(
    data.nomor_putusan_pp ?? data.nomor_putusan_pk ?? String(data.id)
  );

  const formattedDate = data.tanggal_putusan
    ? new Date(data.tanggal_putusan).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    // BUG-18 FIX: Wrap in Link so the card is navigable
    <Link
      href={`/putusan/${slug}`}
      className="block bg-white border border-[var(--pajak-border)] rounded-2xl p-6 shadow-sm hover:border-[var(--pajak-primary)] hover:shadow-md transition-all h-[190px] w-full overflow-hidden"
    >
      <div className="flex h-full">
        {/* Left */}
        <div className="flex-[1.6] pr-6 border-r border-gray-100 flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="text-[var(--pajak-base)] font-bold text-[16px] leading-tight truncate uppercase tracking-tight">
              {data.nomor_putusan_pp ?? data.nomor_putusan_pk ?? "Nomor tidak tersedia"}
            </h4>
            <p className="text-[13px] text-gray-800 font-semibold line-clamp-2">
              {data.pemohon ?? "—"}
              <span className="text-gray-400 font-black mx-1">VS</span>
              {data.termohon ?? "—"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-auto">
            <Badge label={data.jenis_pajak ?? "—"} />
            <Badge
              label={data.amar_putusan ?? "Lain-lain"}
              className={getStatusStyle(data.amar_putusan ?? "")}
            />
            <Badge label={data.upaya_hukum ?? "—"} />
            <Badge label={formattedDate} />
          </div>
        </div>

        {/* Right */}
        <div className="flex-1 pl-6 flex flex-col">
          <h5 className="text-[11px] uppercase font-black text-gray-400 mb-3 tracking-widest">
            Objek Sengketa
          </h5>
          <p className="text-[12px] text-gray-600 line-clamp-5 leading-relaxed font-medium">
            {data.preview_sengketa ?? data.objek_sengketa ?? "Tidak tersedia."}
          </p>
        </div>
      </div>
    </Link>
  );
}

function Badge({ label, className = "bg-white border-gray-200 text-gray-700" }: {
  label: string;
  className?: string;
}) {
  return (
    <span className={`px-3 py-1 rounded-md text-[11px] font-bold border shadow-sm whitespace-nowrap ${className}`}>
      {label}
    </span>
  );
}