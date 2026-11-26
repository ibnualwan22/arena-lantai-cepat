import { NextResponse } from "next/server";
import { createProgram, listPrograms } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const programs = await listPrograms();
    return NextResponse.json({ programs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat daftar program" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Nama program wajib diisi" }, { status: 400 });
    }
    const program = await createProgram({
      name: body.name,
      description: body.description,
      color: body.color,
      slug: body.slug,
      sort_order: body.sort_order,
      is_active: body.is_active,
    });
    return NextResponse.json({ program }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat program" },
      { status: 500 }
    );
  }
}
