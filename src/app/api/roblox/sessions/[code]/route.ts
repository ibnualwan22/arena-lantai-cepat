import { NextResponse } from "next/server";
import { getCustomSessionByCode, listChapters, listPrograms, listVocabularies } from "@/lib/db";

export const dynamic = "force-dynamic";

// Endpoint untuk Roblox Server saat pemain masuk Mode Kustom dengan Kode Sesi
export async function GET(_req: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const session = await getCustomSessionByCode(code);
    if (!session || !session.is_active) {
      return NextResponse.json(
        { ok: false, error: "Kode sesi tidak ditemukan atau sudah dinonaktifkan." },
        { status: 404 }
      );
    }

    const [programs, chapters, vocabs] = await Promise.all([
      listPrograms(),
      listChapters(session.program_id),
      listVocabularies(),
    ]);

    const program = programs.find((p) => p.id === session.program_id);
    if (!program) {
      return NextResponse.json({ ok: false, error: "Program sesi tidak ditemukan." }, { status: 404 });
    }

    const matchedChapters = chapters.filter(
      (c) =>
        c.is_active &&
        c.chapter_number >= session.chapter_from &&
        c.chapter_number <= session.chapter_to
    );
    const chapMap = new Map(matchedChapters.map((c) => [c.id, c]));

    const entries = vocabs
      .filter((v) => v.is_active && chapMap.has(v.chapter_id))
      .map((v) => {
        const chap = chapMap.get(v.chapter_id)!;
        return {
          id: v.id,
          arabic: v.arabic,
          latin: "",
          meaning: v.meaning,
          tip: v.tip || "",
          group: program.slug,
          programId: program.id,
          programSlug: program.slug,
          programName: program.name,
          chapterId: chap.id,
          chapterNumber: chap.chapter_number,
          chapterSlug: chap.slug,
          subGroup: chap.name,
          categoryLabel: `${program.name} • Bab ${chap.chapter_number}`,
        };
      });

    if (entries.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Sesi ini belum memiliki cukup mufrodat (minimal 2 kata)." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        session: {
          id: session.id,
          code: session.code,
          title: session.title,
          programId: program.id,
          programSlug: program.slug,
          programName: program.name,
          programColor: program.color,
          chapterFrom: session.chapter_from,
          chapterTo: session.chapter_to,
        },
        settings: {
          difficultyPreset: session.difficulty_preset,
          correctTilesPerRound: session.correct_tiles_per_round,
          choicesPerRound: session.choices_per_round,
          roundTimeSeconds: session.round_time_seconds,
          timeDecayPerRound: session.time_decay_per_round,
          minRoundTimeSeconds: session.min_round_time_seconds,
          maxRounds: session.max_rounds,
          intermissionSeconds: session.intermission_seconds,
          questionMode: session.question_mode,
          showLatinHint: false,
        },
        entries,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Gagal memuat sesi kustom" },
      { status: 500 }
    );
  }
}
