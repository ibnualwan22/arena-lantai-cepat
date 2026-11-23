import { NextResponse } from "next/server";
import { getGameSettings, isNeonConfigured, listChapters, listVocabularies } from "@/lib/db";

export const dynamic = "force-dynamic";

// Endpoint JSON utama yang dibaca oleh Server Roblox (HttpService:GetAsync)
export async function GET() {
  try {
    const [chapters, vocabs, settings] = await Promise.all([
      listChapters(),
      listVocabularies(),
      getGameSettings(),
    ]);

    const activeChapters = chapters.filter((c) => c.is_active);
    const chapterMap = new Map(activeChapters.map((c) => [c.id, c]));

    const entries = vocabs
      .filter((v) => v.is_active && chapterMap.has(v.chapter_id))
      .map((v) => {
        const chap = chapterMap.get(v.chapter_id)!;
        return {
          id: v.id,
          arabic: v.arabic,
          latin: v.latin,
          meaning: v.meaning,
          tip: v.tip || "",
          group: chap.slug,
          subGroup: v.sub_group || chap.name,
          categoryLabel: chap.name,
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
        showLatinHint: settings.show_latin_hint,
      },
      chapters: activeChapters.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        color: c.color,
        sortOrder: c.sort_order,
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
