'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown, Check, X } from 'lucide-react';

interface DashboardFilters {
  status: string[];
  jenisPajak: string[];
  jenisSengketa: string[];
  upayaHukum: string[];
  pengadilan: string[];
  tahunPutusan: [number, number];
  tahunPajak: [number, number];
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (filters: DashboardFilters) => void;
  initialFilters?: DashboardFilters;
}

const JENIS_PAJAK_OPTIONS = [
  'PPh Pasal 21', 'PPh Pasal 22', 'PPh Pasal 23', 'PPh Pasal 26',
  'PPh Pasal 23/26', 'PPh Badan', 'PPh Final Pasal 4(2)', 'PPh Pasal 15',
  'PPh Pasal 25/29', 'PPh Lainnya', 'PPN', 'PPnBM', 'Kepabeanan',
  'PBB & BPHTB', 'Pajak Daerah', 'Sanksi & Administrasi', 'Tidak Teridentifikasi',
];

const PENGADILAN_OPTIONS = [
  'Pengadilan Pajak',
  'Mahkamah Agung',
  'Pengadilan Tata Usaha Negara',
  'Pengadilan Tinggi',
  'Pengadilan Negeri',
  'Pengadilan Agama',
  'Lainnya',
];

const JENIS_SENGKETA_OPTIONS = [
  'Transfer Pricing', 'BUT & Tax Treaty', 'Koreksi PPh Badan', 'Koreksi PPN',
  'PPh Pemotongan/Pemungutan', 'Sengketa Kepabeanan', 'Klasifikasi Objek Pajak',
  'Sengketa Dokumen & Faktur', 'Sengketa Prosedur & Formal', 'Sanksi Administrasi',
  'Restitusi & Imbalan Bunga', 'NJOP / PBB', 'Saat Terutang & Pengakuan',
  'Kewenangan Pajak', 'Lainnya',
];

const DEFAULT: DashboardFilters = {
  status: [],
  jenisPajak: [],
  jenisSengketa: [],
  upayaHukum: [],
  pengadilan: [],
  tahunPutusan: [2006, 2024],
  tahunPajak: [2006, 2024],
};

const FilterModal = ({ isOpen, onClose, onApplyFilter, initialFilters }: FilterModalProps) => {
  const base = initialFilters ?? DEFAULT;

  const [tahunPutusan, setTahunPutusan] = useState<[number, number]>(base.tahunPutusan);
  const [tahunPajak, setTahunPajak] = useState<[number, number]>(base.tahunPajak);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(base.status);
  const [selectedPajak, setSelectedPajak] = useState<string[]>(base.jenisPajak);
  const [selectedSengketa, setSelectedSengketa] = useState<string[]>(base.jenisSengketa);
  const [selectedUpaya, setSelectedUpaya] = useState<string[]>(base.upayaHukum);
  const [selectedPengadilan, setSelectedPengadilan] = useState<string[]>(
    Array.isArray(base.pengadilan) ? base.pengadilan : []
  );

  useEffect(() => {
    if (!isOpen) return;
    const b = initialFilters ?? DEFAULT;
    setTahunPutusan(b.tahunPutusan);
    setTahunPajak(b.tahunPajak);
    setSelectedStatus(b.status);
    setSelectedPajak(b.jenisPajak);
    setSelectedSengketa(b.jenisSengketa);
    setSelectedUpaya(b.upayaHukum);
    setSelectedPengadilan(Array.isArray(b.pengadilan) ? b.pengadilan : []);
  }, [isOpen, initialFilters]);

  const toggleFilter = (list: string[], setList: (v: string[]) => void, value: string) => {
    if (list.includes(value)) {
      setList(list.filter(item => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  const handleApply = () => {
    onApplyFilter({
      status: selectedStatus,
      jenisPajak: selectedPajak,
      jenisSengketa: selectedSengketa,
      upayaHukum: selectedUpaya,
      pengadilan: selectedPengadilan,
      tahunPutusan,
      tahunPajak,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="bg-white w-full max-w-[640px] rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--pajak-border)] flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={28} className="text-gray-400" />
          </button>
          <h2 className="text-4xl font-[family-name:var(--font-coolvetica)] text-gray-900">Filter</h2>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto font-[family-name:var(--font-montserrat)] custom-scrollbar">

          {/* Status Putusan */}
          <section>
            <h4 className="font-bold text-gray-800 mb-4 text-sm">Status Putusan</h4>
            <div className="flex flex-wrap gap-3">
              {[
                'Mengabulkan Seluruhnya',
                'Mengabulkan Sebagian',
                'Menolak',
                'Tidak Dapat Diterima',
                'Membatalkan',
                'Lain-lain'
              ].map(status => (
                <FilterChip
                  key={status}
                  label={status}
                  active={selectedStatus.includes(status)}
                  onClick={() => toggleFilter(selectedStatus, setSelectedStatus, status)}
                />
              ))}
            </div>
          </section>

          {/* Jenis Pajak */}
          <section>
            <h4 className="font-bold text-gray-800 mb-3 text-sm">Jenis Pajak</h4>
            <MultiSelectDropdown
              placeholder="Pilih jenis pajak..."
              options={JENIS_PAJAK_OPTIONS}
              value={selectedPajak}
              onChange={setSelectedPajak}
            />
          </section>

          {/* Jenis Sengketa */}
          <section>
            <h4 className="font-bold text-gray-800 mb-3 text-sm">Jenis Sengketa</h4>
            <MultiSelectDropdown
              placeholder="Pilih jenis sengketa..."
              options={JENIS_SENGKETA_OPTIONS}
              value={selectedSengketa}
              onChange={setSelectedSengketa}
            />
          </section>

          {/* Upaya Hukum */}
          <section>
            <h4 className="font-bold text-gray-800 mb-4 text-sm">Upaya Hukum</h4>
            <div className="flex flex-wrap gap-3">
              {['Banding', 'Gugatan', 'Peninjauan Kembali'].map(upaya => (
                <FilterChip
                  key={upaya}
                  label={upaya}
                  active={selectedUpaya.includes(upaya)}
                  onClick={() => toggleFilter(selectedUpaya, setSelectedUpaya, upaya)}
                />
              ))}
            </div>
          </section>

          {/* Pengadilan */}
          <section>
            <h4 className="font-bold text-gray-800 mb-3 text-sm">Pengadilan</h4>
            <MultiSelectDropdown
              placeholder="Pilih pengadilan..."
              options={PENGADILAN_OPTIONS}
              value={selectedPengadilan}
              onChange={setSelectedPengadilan}
            />
          </section>

          {/* Tahun */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[var(--pajak-border)]">
            <YearRangePicker label="Tahun Putusan" val={tahunPutusan} setVal={setTahunPutusan} />
            <YearRangePicker label="Tahun Pajak" val={tahunPajak} setVal={setTahunPajak} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-[var(--pajak-border)]">
          <button
            onClick={handleApply}
            className="w-full bg-[var(--pajak-primary)] text-white py-4 rounded-2xl font-bold hover:brightness-110 transition-all text-xl font-[family-name:var(--font-montserrat)] shadow-lg shadow-blue-100"
          >
            Cari
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- Sub-Components --- */

const MultiSelectDropdown = ({
  placeholder, options, value, onChange,
}: {
  placeholder: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((x) => x !== opt) : [...value, opt]);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`
          w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-sm font-semibold
          transition-all duration-200 bg-white
          ${open
            ? 'border-[var(--pajak-primary)] ring-4 ring-blue-50'
            : 'border-[var(--pajak-border)] hover:border-gray-300'}
        `}
      >
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {value.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            value.map((v) => (
              <span
                key={v}
                className="flex items-center gap-1 bg-blue-50 text-[var(--pajak-primary)] text-[11px] font-bold px-2.5 py-1 rounded-full border border-blue-100"
              >
                {v}
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); toggle(v); }}
                  className="hover:text-blue-800 transition-colors"
                >
                  <X size={10} />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-2 border-2 border-[var(--pajak-border)] rounded-2xl overflow-hidden bg-white shadow-lg">
          <div className="overflow-y-auto max-h-52 custom-scrollbar">
            {options.map((opt) => {
              const selected = value.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left
                    transition-colors duration-150
                    ${selected
                      ? 'bg-blue-50 text-[var(--pajak-primary)] font-bold'
                      : 'text-gray-700 font-medium hover:bg-gray-50'}
                  `}
                >
                  <div className={`
                    w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all
                    ${selected
                      ? 'bg-[var(--pajak-primary)] border-[var(--pajak-primary)]'
                      : 'border-gray-300 bg-white'}
                  `}>
                    {selected && <Check size={10} strokeWidth={3} className="text-white" />}
                  </div>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`
      px-5 py-2 rounded-full text-[13px] font-bold border-2 transition-all flex items-center gap-3
      ${active
        ? 'bg-blue-50 border-[var(--pajak-primary)] text-[var(--pajak-primary)] shadow-sm'
        : 'bg-white border-[var(--pajak-border)] text-gray-400 hover:border-gray-300'}
    `}
  >
    <div className={`
      w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
      ${active ? 'bg-[var(--pajak-primary)] border-[var(--pajak-primary)]' : 'border-gray-300 bg-white'}
    `}>
      <svg
        width="12" height="10" viewBox="0 0 12 10" fill="none"
        className={`transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
      >
        <path d="M2 5L4.5 7.5L10 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    <span>{label}</span>
  </button>
);

const YEAR_MIN = 2006;
const YEAR_MAX = 2024;
const ALL_YEARS = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i);

const YearRangePicker = ({ label, val, setVal }: { label: string; val: [number, number]; setVal: (v: [number, number]) => void }) => {
  const pct = (y: number) => ((y - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;
  const isDefault = val[0] === YEAR_MIN && val[1] === YEAR_MAX;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-800 text-sm">{label}</h4>
        {!isDefault && (
          <button
            type="button"
            onClick={() => setVal([YEAR_MIN, YEAR_MAX])}
            className="text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Range labels */}
      <div className="flex justify-between text-[10px] font-black text-gray-500 px-0.5">
        <span>{YEAR_MIN}</span>
        <span>{YEAR_MAX}</span>
      </div>


      {/* Range bar */}
      <div className="relative h-1.5 bg-gray-100 rounded-full mx-0.5">
        <div
          className="absolute h-full bg-[var(--pajak-primary)] rounded-full transition-all duration-200"
          style={{ left: `${pct(val[0])}%`, right: `${100 - pct(val[1])}%` }}
        />
        <div
          className="absolute w-3 h-3 bg-[var(--pajak-primary)] rounded-full border-2 border-white shadow -top-[3px] -translate-x-1/2 transition-all duration-200"
          style={{ left: `${pct(val[0])}%` }}
        />
        <div
          className="absolute w-3 h-3 bg-[var(--pajak-primary)] rounded-full border-2 border-white shadow -top-[3px] -translate-x-1/2 transition-all duration-200"
          style={{ left: `${pct(val[1])}%` }}
        />
      </div>

      {/* Dropdowns */}
      <div className="flex items-center gap-2">
        <select
          value={val[0]}
          onChange={(e) => {
            const next = Number(e.target.value);
            setVal([Math.min(next, val[1]), val[1]]);
          }}
          className="flex-1 px-3 py-2 rounded-xl border-2 border-[var(--pajak-border)] text-sm font-bold text-gray-800 bg-white focus:outline-none focus:border-[var(--pajak-primary)] transition-colors text-center cursor-pointer"
        >
          {ALL_YEARS.map((y) => (
            <option key={y} value={y} disabled={y > val[1]}>{y}</option>
          ))}
        </select>
        <span className="text-gray-300 font-black text-base shrink-0">–</span>
        <select
          value={val[1]}
          onChange={(e) => {
            const next = Number(e.target.value);
            setVal([val[0], Math.max(next, val[0])]);
          }}
          className="flex-1 px-3 py-2 rounded-xl border-2 border-[var(--pajak-border)] text-sm font-bold text-gray-800 bg-white focus:outline-none focus:border-[var(--pajak-primary)] transition-colors text-center cursor-pointer"
        >
          {ALL_YEARS.map((y) => (
            <option key={y} value={y} disabled={y < val[0]}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FilterModal;
