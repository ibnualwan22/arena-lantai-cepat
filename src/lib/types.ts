export type QuestionMode = "auto" | "id_to_ar_hint" | "ar_to_id" | "id_to_ar_hard";
export type DifficultyPreset = "mudah" | "sedang" | "sulit" | "custom";

export interface Chapter {
  id: number;
  slug: string;
  name: string;
  description: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  vocab_count?: number;
}

export interface Vocabulary {
  id: number;
  chapter_id: number;
  arabic: string;
  latin: string;
  meaning: string;
  tip: string;
  sub_group: string;
  is_active: boolean;
}

export interface GameSettings {
  id: number;
  difficulty_preset: DifficultyPreset;
  correct_tiles_per_round: number; // 1..12 dari 16 kotak arena
  choices_per_round: number; // 2..4 pilihan jawaban unik per ronde
  round_time_seconds: number; // 3..20 detik
  time_decay_per_round: number; // pengurangan waktu tiap ronde (0..1.5 detik)
  min_round_time_seconds: number; // batas minimum timer ronde
  max_rounds: number; // 3..25 ronde
  intermission_seconds: number; // 3..30 detik
  question_mode: QuestionMode;
  show_latin_hint: boolean;
  updated_at?: string;
}

export const DIFFICULTY_PRESETS: Record<
  Exclude<DifficultyPreset, "custom">,
  {
    label: string;
    description: string;
    correct_tiles_per_round: number;
    choices_per_round: number;
    round_time_seconds: number;
    time_decay_per_round: number;
    min_round_time_seconds: number;
    question_mode: QuestionMode;
    show_latin_hint: boolean;
  }
> = {
  mudah: {
    label: "Mudah (Pemula)",
    description: "6 kotak benar dari 16 kotak, 3 pilihan jawaban, waktu 10 detik, ada cara baca.",
    correct_tiles_per_round: 6,
    choices_per_round: 3,
    round_time_seconds: 10.0,
    time_decay_per_round: 0.2,
    min_round_time_seconds: 6.5,
    question_mode: "id_to_ar_hint",
    show_latin_hint: true,
  },
  sedang: {
    label: "Sedang (Standar)",
    description: "4 kotak benar dari 16 kotak, 4 pilihan jawaban, waktu 8 detik, mode progresif.",
    correct_tiles_per_round: 4,
    choices_per_round: 4,
    round_time_seconds: 8.0,
    time_decay_per_round: 0.3,
    min_round_time_seconds: 5.0,
    question_mode: "auto",
    show_latin_hint: true,
  },
  sulit: {
    label: "Sulit (Tantangan)",
    description: "Hanya 2 kotak benar dari 16 kotak! 4 pilihan, waktu 6 detik, tanpa petunjuk latin.",
    correct_tiles_per_round: 2,
    choices_per_round: 4,
    round_time_seconds: 6.0,
    time_decay_per_round: 0.25,
    min_round_time_seconds: 4.0,
    question_mode: "id_to_ar_hard",
    show_latin_hint: false,
  },
};
