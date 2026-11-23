import { NextResponse } from "next/server";
import { deleteChapter, updateChapter } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) {
      return NextResponse.json({ error: "ID bab tidak valid" }, { status: 400 });
    }
    const body = await req.json();
    const updated = await updateChapter(numericId, body);
    if (!updated) {
      return NextResponse.json({ error: "Bab tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ chapter: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengubah bab" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) {
      return NextResponse.json({ error: "ID bab tidak valid" }, { status: 400 });
    }
    const deleted = await deleteChapter(numericId);
    if (!deleted) {
      return NextResponse.json({ error: "Bab tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus bab" },
      { status: 500 }
    );
  }
}
