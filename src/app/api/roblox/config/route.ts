import { NextResponse } from "next/server";
import { getGameSettings, isNeonConfigured, listChapters, listPrograms, listVocabularies } from "@/lib/db";

export const dynamic = "force-dynamic";

// Endpoint JSON utama Mode Umum untuk Server Roblox (membuka semua program aktif + seluruh bab di dalamnya)
export async function GET() {
  try {
    const [programs, chapters, vocabs, settings] = await Promise.all([
      listPrograms(),
      listChapters(),
      listVocabularies(),
      getGameSettings(),
    ]);

    const activePrograms = programs.filter((p) => p.is_active);
    const progMap = new Map(activePrograms.map((p) => [p.id, p]));
    const activeChapters = chapters.filter((c) => c.is_active && progMap.has(c.program_id));
    const chapMap = new Map(activeChapters.map((c) => [c.id, c]));

    const entries = vocabs
      .filter((v) => v.is_active && chapMap.has(v.chapter_id))
      .map((v) => {
        const chap = chapMap.get(v.chapter_id)!;
        const prog = progMap.get(chap.program_id)!;
        return {
          id: v.id,
          arabic: v.arabic,
          latin: "",
          meaning: v.meaning,
          tip: v.tip || "",
          // group menggunakan program.slug agar vote pad Mode Umum memilih per Program (semua bab di dalamnya)!
          group: prog.slug,
          programId: prog.id,
          programSlug: prog.slug,
          programName: prog.name,
          chapterId: chap.id,
          chapterNumber: chap.chapter_number,
          chapterSlug: chap.slug,
          subGroup: chap.name,
          categoryLabel: `${prog.name} • Bab ${chap.chapter_number}`,
        };
      });

    const programPayloads = activePrograms.map((p) => {
      const pChaps = activeChapters.filter((c) => c.program_id === p.id);
      const pEntriesCount = entries.filter((e) => e.programId === p.id).length;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        color: p.color,
        sortOrder: p.sort_order,
        vocabCount: pEntriesCount,
        chapters: pChaps.map((c) => ({
          id: c.id,
          chapterNumber: c.chapter_number,
          slug: c.slug,
          name: c.name,
          color: c.color,
        })),
      };
    });

    const payload = {
      version: settings.updated_at || new Date().toISOString(),
      storageMode: isNeonConfigured() ? "neon" : "local",
      settings: {
        difficultyPreset: settings.difficulty_preset,
        correctTilesPerRound: settings.correct_tiles_per_round,
        choicesPerRound: settings.choices_per_round,
        roundTimeSeconds: settings.round_time_seconds,
        timeDecayPerRound: settings.time_decay_per_round,
        minRoundTimeSeconds: settings.min_round_time_seconds,
        maxRounds: settings.max_rounds,
        intermissionSeconds: settings.intermission_seconds,
        questionMode: settings.question_mode,
        showLatinHint: false,
      },
      programs: programPayloads,
      // Backward-compatible: `chapters` berisi daftar Program agar pad voting lama & baru sama-sama sinkron!
      chapters: programPayloads.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        color: p.color,
        sortOrder: p.sortOrder,
      })),
      entries,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghasilkan konfigurasi Roblox" },
      { status: 500 }
    );
  }
}
