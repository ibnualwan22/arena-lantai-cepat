import { NextResponse } from "next/server";
import { createChapter, listChapters } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const chapters = await listChapters();
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
