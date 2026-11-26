import { NextResponse } from "next/server";
import { createChapter, listChapters } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const progParam = searchParams.get("programId");
    const progId = progParam ? Number(progParam) : undefined;
    const chapters = await listChapters(progId && Number.isInteger(progId) ? progId : undefined);
    return NextResponse.json({ chapters });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat daftar bab" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Nama bab wajib diisi" }, { status: 400 });
    }
    const chapter = await createChapter({
      program_id: body.program_id ? Number(body.program_id) : undefined,
      chapter_number: body.chapter_number !== undefined ? Number(body.chapter_number) : undefined,
      name: body.name,
      description: body.description,
      color: body.color,
      slug: body.slug,
      sort_order: body.sort_order,
      is_active: body.is_active,
    });
    return NextResponse.json({ chapter }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat bab" },
      { status: 500 }
    );
  }
}
