import { NextResponse } from "next/server";
import { isNeonConfigured, listChapters, listCustomSessions, listPrograms, listVocabularies } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [programs, chapters, vocabs, sessions] = await Promise.all([
      listPrograms(),
      listChapters(),
      listVocabularies(),
      listCustomSessions(),
    ]);
    return NextResponse.json({
      storageMode: isNeonConfigured() ? "neon" : "local",
      connected: true,
      programCount: programs.length,
      activeProgramCount: programs.filter((p) => p.is_active).length,
      chapterCount: chapters.length,
      activeChapterCount: chapters.filter((c) => c.is_active).length,
      vocabCount: vocabs.length,
      activeVocabCount: vocabs.filter((v) => v.is_active).length,
      sessionCount: sessions.filter((s) => s.is_active).length,
    });
  } catch (err) {
    return NextResponse.json(
      {
        storageMode: isNeonConfigured() ? "neon" : "local",
        connected: false,
        error: err instanceof Error ? err.message : "Database connection error",
      },
      { status: 500 }
    );
  }
}
