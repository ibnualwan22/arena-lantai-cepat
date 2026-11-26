import { NextResponse } from "next/server";
import { deleteCustomSession, updateCustomSession } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) {
      return NextResponse.json({ error: "ID sesi tidak valid" }, { status: 400 });
    }
    const body = await req.json();
    const updated = await updateCustomSession(numericId, body);
    if (!updated) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ session: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengubah sesi" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) {
      return NextResponse.json({ error: "ID sesi tidak valid" }, { status: 400 });
    }
    const deleted = await deleteCustomSession(numericId);
    if (!deleted) {
      return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus sesi" },
      { status: 500 }
    );
  }
}
