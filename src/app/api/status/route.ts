import { NextResponse } from "next/server";
import { isNeonConfigured, listChapters, listVocabularies } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [chapters, vocabs] = await Promise.all([listChapters(), listVocabularies()]);
    return NextResponse.json({
      storageMode: isNeonConfigured() ? "neon" : "local",
      connected: true,
      chapterCount: chapters.length,
      activeChapterCount: chapters.filter((c) => c.is_active).length,
      vocabCount: vocabs.length,
      activeVocabCount: vocabs.filter((v) => v.is_active).length,
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
