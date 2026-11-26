import { NextResponse } from "next/server";
import { createCustomSession, listCustomSessions } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessions = await listCustomSessions();
    return NextResponse.json({ sessions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat daftar sesi" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Nama sesi wajib diisi" }, { status: 400 });
    }
    if (!body?.program_id) {
      return NextResponse.json({ error: "Program wajib dipilih" }, { status: 400 });
    }
    const session = await createCustomSession({
      title: body.title,
      program_id: Number(body.program_id),
      chapter_from: Number(body.chapter_from ?? 1),
      chapter_to: Number(body.chapter_to ?? body.chapter_from ?? 1),
      code: body.code,
      difficulty_preset: body.difficulty_preset,
      correct_tiles_per_round: body.correct_tiles_per_round,
      choices_per_round: body.choices_per_round,
      round_time_seconds: body.round_time_seconds,
      time_decay_per_round: body.time_decay_per_round,
      min_round_time_seconds: body.min_round_time_seconds,
      max_rounds: body.max_rounds,
      intermission_seconds: body.intermission_seconds,
      question_mode: body.question_mode,
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat sesi kustom" },
      { status: 500 }
    );
  }
}
