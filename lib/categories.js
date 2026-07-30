// Definisi kategori dashboard Enginova. equipKeys merujuk ke key di lib/equipment.js.
// Kategori dengan equipKeys kosong ditandai "Segera Hadir" di UI.
export const CATEGORIES = [
  {
    key: 'kabel-konduktor', label: 'Kabel & Konduktor', color: 'blue', icon: 'Zap',
    desc: 'Perhitungan KHA, sheath, sagging, dan analisis kabel/konduktor lainnya.',
    equipKeys: ['kabel', 'kha', 'konduktor'],
  },
  {
    key: 'proteksi-relay', label: 'Proteksi & Relay', color: 'green', icon: 'ShieldCheck',
    desc: 'Setting relay, koordinasi proteksi, dan kurva TCC.',
    equipKeys: ['trafo', 'motor', 'busbar', 'feeder', 'koordinasi', 'gardu'],
  },
  {
    key: 'generator-mesin', label: 'Generator & Mesin', color: 'purple', icon: 'Cog',
    desc: 'Perhitungan generator, eksitasi, dan performa mesin.',
    equipKeys: ['generator'],
  },
  {
    key: 'sistem-tenaga', label: 'Sistem Tenaga', color: 'orange', icon: 'Radio',
    desc: 'Short circuit, load flow, dan analisis stabilitas sistem.',
    equipKeys: [],
  },
  {
    key: 'bess-energi', label: 'BESS & Energi', color: 'teal', icon: 'BatteryCharging',
    desc: 'Perhitungan BESS, kapasitas, dan penyimpanan energi.',
    equipKeys: [],
  },
  {
    key: 'analisis-evaluasi', label: 'Analisis & Evaluasi', color: 'sky', icon: 'BarChart3',
    desc: 'Harmonik, transient, motor starting, dan analisis lainnya.',
    equipKeys: [],
  },
  {
    key: 'standar-referensi', label: 'Standar & Referensi', color: 'slate', icon: 'BookOpen',
    desc: 'Referensi standar IEC, IEEE, SPLN, dan dokumen teknis.',
    equipKeys: [],
  },
  {
    key: 'alat-bantu', label: 'Alat Bantu', color: 'gray', icon: 'Wrench',
    desc: 'Konversi satuan, tabel referensi, dan alat bantu lainnya.',
    equipKeys: [],
  },
];
