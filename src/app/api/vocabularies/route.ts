import { NextResponse } from "next/server";
import { createVocabularies, listVocabularies } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chapterIdParam = searchParams.get("chapterId");
    const chapterId = chapterIdParam ? Number(chapterIdParam) : undefined;
    const vocabularies = await listVocabularies(
      chapterId && Number.isInteger(chapterId) ? chapterId : undefined
    );
    return NextResponse.json({ vocabularies });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat daftar mufrodat" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawItems = Array.isArray(body?.items) ? body.items : [body];

    const validItems = [];
    for (const item of rawItems) {
      if (!item?.chapter_id || !item?.arabic?.trim() || !item?.latin?.trim() || !item?.meaning?.trim()) {
        return NextResponse.json(
          { error: "Setiap mufrodat wajib memiliki bab, tulisan Arab, cara baca (latin), dan arti." },
          { status: 400 }
        );
      }
      validItems.push({
        chapter_id: Number(item.chapter_id),
        arabic: String(item.arabic),
        latin: String(item.latin),
        meaning: String(item.meaning),
        tip: item.tip ? String(item.tip) : "",
        sub_group: item.sub_group ? String(item.sub_group) : "Umum",
        is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
      });
    }

    const created = await createVocabularies(validItems);
    return NextResponse.json({ vocabularies: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menambahkan mufrodat" },
      { status: 500 }
    );
  }
}
