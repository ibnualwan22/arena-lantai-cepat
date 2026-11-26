import type { GameSettings } from "./types";

export const DEFAULT_SETTINGS: GameSettings = {
  id: 1,
  difficulty_preset: "sedang",
  correct_tiles_per_round: 4,
  choices_per_round: 4,
  round_time_seconds: 8.0,
  time_decay_per_round: 0.3,
  min_round_time_seconds: 5.0,
  max_rounds: 10,
  intermission_seconds: 8,
  question_mode: "auto",
  show_latin_hint: false,
};

export interface SeedChapter {
  chapter_number: number;
  slug: string;
  name: string;
  description: string;
  color: string;
  sort_order: number;
  vocabularies: {
    arabic: string;
    latin?: string;
    meaning: string;
    tip?: string;
    sub_group?: string;
  }[];
}

export interface SeedProgram {
  slug: string;
  name: string;
  description: string;
  color: string;
  sort_order: number;
  chapters: SeedChapter[];
}

export const SEED_PROGRAMS: SeedProgram[] = [
  {
    slug: "mufrodat-dasar",
    name: "Program Mufrodat Dasar",
    description: "Kosakata bahasa Arab dasar untuk pemula: benda, sekolah, hewan, alam, angka, dan warna.",
    color: "#10B981",
    sort_order: 1,
    chapters: [
      {
        chapter_number: 1,
        slug: "benda-sekolah",
        name: "Bab 1: Benda & Sekolah",
        description: "Kosakata benda sehari-hari di ruang kelas dan rumah.",
        color: "#3B82F6",
        sort_order: 1,
        vocabularies: [
          { arabic: "كِتَابٌ", meaning: "Buku" },
          { arabic: "قَلَمٌ", meaning: "Pena / Pulpen" },
          { arabic: "مَكْتَبٌ", meaning: "Meja" },
          { arabic: "كُرْسِيٌّ", meaning: "Kursi" },
          { arabic: "بَابٌ", meaning: "Pintu" },
          { arabic: "نَافِذَةٌ", meaning: "Jendela" },
          { arabic: "سَبُّورَةٌ", meaning: "Papan Tulis" },
          { arabic: "مَدْرَسَةٌ", meaning: "Sekolah" },
          { arabic: "بَيْتٌ", meaning: "Rumah" },
          { arabic: "مَسْجِدٌ", meaning: "Masjid" },
          { arabic: "حَقِيبَةٌ", meaning: "Tas" },
          { arabic: "سَاعَةٌ", meaning: "Jam" },
          { arabic: "مَاءٌ", meaning: "Air" },
          { arabic: "خُبْزٌ", meaning: "Roti" },
          { arabic: "مِفْتَاحٌ", meaning: "Kunci" },
        ],
      },
      {
        chapter_number: 2,
        slug: "hewan-alam",
        name: "Bab 2: Hewan & Alam",
        description: "Nama hewan populer dan benda-benda alam di sekitar kita.",
        color: "#EC4899",
        sort_order: 2,
        vocabularies: [
          { arabic: "قِطٌّ", meaning: "Kucing" },
          { arabic: "سَمَكٌ", meaning: "Ikan" },
          { arabic: "طَيْرٌ", meaning: "Burung" },
          { arabic: "أَسَدٌ", meaning: "Singa" },
          { arabic: "جَمَلٌ", meaning: "Unta" },
          { arabic: "فِيلٌ", meaning: "Gajah" },
          { arabic: "شَمْسٌ", meaning: "Matahari" },
          { arabic: "قَمَرٌ", meaning: "Bulan" },
          { arabic: "نَجْمٌ", meaning: "Bintang" },
          { arabic: "شَجَرَةٌ", meaning: "Pohon" },
          { arabic: "زَهْرَةٌ", meaning: "Bunga" },
          { arabic: "بَحْرٌ", meaning: "Laut" },
        ],
      },
      {
        chapter_number: 3,
        slug: "angka-warna",
        name: "Bab 3: Angka & Warna",
        description: "Bilangan dasar serta warna-warna utama dalam Bahasa Arab.",
        color: "#F59E0B",
        sort_order: 3,
        vocabularies: [
          { arabic: "وَاحِدٌ", meaning: "Satu (1)" },
          { arabic: "اِثْنَانِ", meaning: "Dua (2)" },
          { arabic: "ثَلَاثَةٌ", meaning: "Tiga (3)" },
          { arabic: "أَرْبَعَةٌ", meaning: "Empat (4)" },
          { arabic: "خَمْسَةٌ", meaning: "Lima (5)" },
          { arabic: "سِتَّةٌ", meaning: "Enam (6)" },
          { arabic: "سَبْعَةٌ", meaning: "Tujuh (7)" },
          { arabic: "عَشَرَةٌ", meaning: "Sepuluh (10)" },
          { arabic: "أَحْمَرُ", meaning: "Merah" },
          { arabic: "أَزْرَقُ", meaning: "Biru" },
          { arabic: "أَخْضَرُ", meaning: "Hijau" },
          { arabic: "أَصْفَرُ", meaning: "Kuning" },
          { arabic: "أَبْيَضُ", meaning: "Putih" },
          { arabic: "أَسْوَدُ", meaning: "Hitam" },
        ],
      },
    ],
  },
];

export const SEED_CHAPTERS = SEED_PROGRAMS[0].chapters;
