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
  show_latin_hint: true,
};

export interface SeedChapter {
  slug: string;
  name: string;
  description: string;
  color: string;
  sort_order: number;
  vocabularies: {
    arabic: string;
    latin: string;
    meaning: string;
    tip: string;
    sub_group: string;
  }[];
}

export const SEED_CHAPTERS: SeedChapter[] = [
  {
    slug: "hijaiyah",
    name: "Bab 1: Huruf Hijaiyah",
    description: "Mengenal huruf-huruf dasar Bahasa Arab beserta ciri titiknya.",
    color: "#10B981",
    sort_order: 1,
    vocabularies: [
      { arabic: "أ", latin: "Alif", meaning: "Huruf Alif", tip: "Garis tegak dengan hamzah di atas", sub_group: "Hijaiyah" },
      { arabic: "ب", latin: "Ba", meaning: "Huruf Ba", tip: "1 titik di bawah", sub_group: "Hijaiyah" },
      { arabic: "ت", latin: "Ta", meaning: "Huruf Ta", tip: "2 titik di atas", sub_group: "Hijaiyah" },
      { arabic: "ث", latin: "Tsa", meaning: "Huruf Tsa", tip: "3 titik di atas", sub_group: "Hijaiyah" },
      { arabic: "ج", latin: "Jim", meaning: "Huruf Jim", tip: "1 titik di tengah perut", sub_group: "Hijaiyah" },
      { arabic: "ح", latin: "Ha", meaning: "Huruf Ha", tip: "Tanpa titik, suara bersih", sub_group: "Hijaiyah" },
      { arabic: "خ", latin: "Kho", meaning: "Huruf Kho", tip: "1 titik di atas kepala", sub_group: "Hijaiyah" },
      { arabic: "د", latin: "Dal", meaning: "Huruf Dal", tip: "Melengkung tanpa titik", sub_group: "Hijaiyah" },
      { arabic: "ر", latin: "Ro", meaning: "Huruf Ro", tip: "Seperti sabit ke bawah", sub_group: "Hijaiyah" },
      { arabic: "س", latin: "Sin", meaning: "Huruf Sin", tip: "3 gigi tanpa titik", sub_group: "Hijaiyah" },
      { arabic: "ش", latin: "Syin", meaning: "Huruf Syin", tip: "3 gigi dengan 3 titik di atas", sub_group: "Hijaiyah" },
      { arabic: "ص", latin: "Shod", meaning: "Huruf Shod", tip: "Oval tanpa titik", sub_group: "Hijaiyah" },
      { arabic: "ع", latin: "Ain", meaning: "Huruf Ain", tip: "Seperti angka 3 terbalik", sub_group: "Hijaiyah" },
      { arabic: "ف", latin: "Fa", meaning: "Huruf Fa", tip: "Kepala bulat, 1 titik di atas", sub_group: "Hijaiyah" },
      { arabic: "ق", latin: "Qof", meaning: "Huruf Qof", tip: "Kepala bulat, 2 titik di atas", sub_group: "Hijaiyah" },
      { arabic: "ك", latin: "Kaf", meaning: "Huruf Kaf", tip: "Siku tegak dengan tanda kecil", sub_group: "Hijaiyah" },
      { arabic: "ل", latin: "Lam", meaning: "Huruf Lam", tip: "Seperti kail pancing", sub_group: "Hijaiyah" },
      { arabic: "م", latin: "Mim", meaning: "Huruf Mim", tip: "Bulatan kecil dengan ekor ke bawah", sub_group: "Hijaiyah" },
      { arabic: "ن", latin: "Nun", meaning: "Huruf Nun", tip: "Mangkuk dengan 1 titik di tengah atas", sub_group: "Hijaiyah" },
      { arabic: "و", latin: "Waw", meaning: "Huruf Waw", tip: "Seperti angka 9", sub_group: "Hijaiyah" },
      { arabic: "ي", latin: "Ya", meaning: "Huruf Ya", tip: "2 titik di bawah", sub_group: "Hijaiyah" },
    ],
  },
  {
    slug: "benda-sekolah",
    name: "Bab 2: Benda & Sekolah",
    description: "Kosakata (mufrodat) benda sehari-hari di ruang kelas dan rumah.",
    color: "#3B82F6",
    sort_order: 2,
    vocabularies: [
      { arabic: "كِتَابٌ", latin: "Kitābun", meaning: "Buku", tip: "Kata dasar 'kitab' dalam bahasa Indonesia", sub_group: "Benda" },
      { arabic: "قَلَمٌ", latin: "Qalamun", meaning: "Pena / Pulpen", tip: "Alat untuk menulis", sub_group: "Benda" },
      { arabic: "مَكْتَبٌ", latin: "Maktabun", meaning: "Meja", tip: "Tempat menulis dan belajar", sub_group: "Benda" },
      { arabic: "كُرْسِيٌّ", latin: "Kursiyyun", meaning: "Kursi", tip: "Sama dengan kata 'kursi' di Indonesia", sub_group: "Benda" },
      { arabic: "بَابٌ", latin: "Bābun", meaning: "Pintu", tip: "Jalan masuk ruangan", sub_group: "Benda" },
      { arabic: "نَافِذَةٌ", latin: "Nāfidzatun", meaning: "Jendela", tip: "Tempat masuk cahaya & udara", sub_group: "Benda" },
      { arabic: "سَبُّورَةٌ", latin: "Sabbūratun", meaning: "Papan Tulis", tip: "Di depan ruang kelas", sub_group: "Benda" },
      { arabic: "مَدْرَسَةٌ", latin: "Madrasatun", meaning: "Sekolah", tip: "Asal kata 'madrasah'", sub_group: "Benda" },
      { arabic: "بَيْتٌ", latin: "Baitun", meaning: "Rumah", tip: "Tempat tinggal keluarga", sub_group: "Benda" },
      { arabic: "مَسْجِدٌ", latin: "Masjidun", meaning: "Masjid", tip: "Tempat ibadah umat Islam", sub_group: "Benda" },
      { arabic: "حَقِيبَةٌ", latin: "Ḥaqībatun", meaning: "Tas", tip: "Membawa buku ke sekolah", sub_group: "Benda" },
      { arabic: "سَاعَةٌ", latin: "Sā'atun", meaning: "Jam", tip: "Penunjuk waktu", sub_group: "Benda" },
      { arabic: "مَاءٌ", latin: "Mā'un", meaning: "Air", tip: "Minuman pelepas dahaga", sub_group: "Benda" },
      { arabic: "خُبْزٌ", latin: "Khubzun", meaning: "Roti", tip: "Makanan pokok dari gandum", sub_group: "Benda" },
      { arabic: "مِفْتَاحٌ", latin: "Miftāḥun", meaning: "Kunci", tip: "Pembuka pintu", sub_group: "Benda" },
    ],
  },
  {
    slug: "hewan-alam",
    name: "Bab 3: Hewan & Alam",
    description: "Mengenal nama hewan populer dan benda-benda alam di sekitar kita.",
    color: "#EC4899",
    sort_order: 3,
    vocabularies: [
      { arabic: "قِطٌّ", latin: "Qiṭṭun", meaning: "Kucing", tip: "Hewan peliharaan yang lucu", sub_group: "Hewan" },
      { arabic: "سَمَكٌ", latin: "Samakun", meaning: "Ikan", tip: "Hidup di air", sub_group: "Hewan" },
      { arabic: "طَيْرٌ", latin: "Ṭairun", meaning: "Burung", tip: "Terbang di langit", sub_group: "Hewan" },
      { arabic: "أَسَدٌ", latin: "Asadun", meaning: "Singa", tip: "Raja hutan", sub_group: "Hewan" },
      { arabic: "جَمَلٌ", latin: "Jamalun", meaning: "Unta", tip: "Hewan gurun pasir", sub_group: "Hewan" },
      { arabic: "فِيلٌ", latin: "Fīlun", meaning: "Gajah", tip: "Hewan besar berbelalai", sub_group: "Hewan" },
      { arabic: "شَمْسٌ", latin: "Syamsun", meaning: "Matahari", tip: "Bersinar di siang hari", sub_group: "Alam" },
      { arabic: "قَمَرٌ", latin: "Qamarun", meaning: "Bulan", tip: "Tampak di malam hari", sub_group: "Alam" },
      { arabic: "نَجْمٌ", latin: "Najmun", meaning: "Bintang", tip: "Berkelip di langit malam", sub_group: "Alam" },
      { arabic: "شَجَرَةٌ", latin: "Syajaratun", meaning: "Pohon", tip: "Tumbuhan tinggi berdaun", sub_group: "Alam" },
      { arabic: "زَهْرَةٌ", latin: "Zahratun", meaning: "Bunga", tip: "Indah dan harum", sub_group: "Alam" },
      { arabic: "بَحْرٌ", latin: "Baḥrun", meaning: "Laut", tip: "Perairan luas dan asin", sub_group: "Alam" },
    ],
  },
  {
    slug: "angka-warna",
    name: "Bab 4: Angka & Warna",
    description: "Bilangan dasar 1–10 serta warna-warna utama dalam Bahasa Arab.",
    color: "#F59E0B",
    sort_order: 4,
    vocabularies: [
      { arabic: "وَاحِدٌ", latin: "Wāḥidun", meaning: "Satu (1)", tip: "Angka 1", sub_group: "Angka" },
      { arabic: "اِثْنَانِ", latin: "Itsnāni", meaning: "Dua (2)", tip: "Angka 2", sub_group: "Angka" },
      { arabic: "ثَلَاثَةٌ", latin: "Tsalātsatun", meaning: "Tiga (3)", tip: "Angka 3", sub_group: "Angka" },
      { arabic: "أَرْبَعَةٌ", latin: "Arba'atun", meaning: "Empat (4)", tip: "Angka 4", sub_group: "Angka" },
      { arabic: "خَمْسَةٌ", latin: "Khamsatun", meaning: "Lima (5)", tip: "Angka 5", sub_group: "Angka" },
      { arabic: "سِتَّةٌ", latin: "Sittatun", meaning: "Enam (6)", tip: "Angka 6", sub_group: "Angka" },
      { arabic: "سَبْعَةٌ", latin: "Sab'atun", meaning: "Tujuh (7)", tip: "Angka 7", sub_group: "Angka" },
      { arabic: "عَشَرَةٌ", latin: "'Asyaratun", meaning: "Sepuluh (10)", tip: "Angka 10", sub_group: "Angka" },
      { arabic: "أَحْمَرُ", latin: "Aḥmaru", meaning: "Merah", tip: "Warna bendera Indonesia atas", sub_group: "Warna" },
      { arabic: "أَزْرَقُ", latin: "Azraqu", meaning: "Biru", tip: "Warna langit cerah", sub_group: "Warna" },
      { arabic: "أَخْضَرُ", latin: "Akhḍaru", meaning: "Hijau", tip: "Warna dedaunan", sub_group: "Warna" },
      { arabic: "أَصْفَرُ", latin: "Aṣfaru", meaning: "Kuning", tip: "Warna pisang & matahari", sub_group: "Warna" },
      { arabic: "أَبْيَضُ", latin: "Abyaḍu", meaning: "Putih", tip: "Warna awan bersih", sub_group: "Warna" },
      { arabic: "أَسْوَدُ", latin: "Aswadu", meaning: "Hitam", tip: "Warna langit malam", sub_group: "Warna" },
    ],
  },
];
