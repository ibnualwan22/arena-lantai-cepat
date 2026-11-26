import { NextResponse } from "next/server";
import { addProgramPlayerProgress, listLeaderboard, listProgramLeaderboards, upsertPlayerStat } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = Number(body?.userId ?? body?.roblox_user_id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "userId tidak valid" }, { status: 400 });
    }
    const username = String(body?.username || `Player_${userId}`).slice(0, 64);
    const displayName = String(body?.displayName || body?.display_name || username || "Pemain").slice(0, 80);
    const rankTitle = String(body?.rankTitle || body?.rank_title || "Mubtadi'").slice(0, 48);
    const bestStreak = Math.max(0, Math.floor(Number(body?.bestStreak ?? body?.best_streak ?? 0)));

    const saved = await upsertPlayerStat({
      roblox_user_id: Math.trunc(userId),
      username,
      display_name: displayName,
      rank_points: Math.max(0, Math.floor(Number(body?.rankPoints ?? body?.rank_points ?? 0))),
      rank_title: rankTitle,
      dinar: Math.max(0, Math.floor(Number(body?.dinar ?? 0))),
      total_correct: Math.max(0, Math.floor(Number(body?.totalCorrect ?? body?.total_correct ?? 0))),
      best_streak: bestStreak,
      wins: Math.max(0, Math.floor(Number(body?.wins ?? 0))),
    });

    // Also record per-program progress if programId / programSlug was sent (from both General & Custom Session modes!)
    const programId = body?.programId ? Number(body.programId) : undefined;
    const programSlug = typeof body?.programSlug === "string" && body.programSlug.trim() ? body.programSlug.trim() : undefined;
    if (programId || programSlug) {
      await addProgramPlayerProgress({
        programId: programId && Number.isFinite(programId) ? Math.trunc(programId) : undefined,
        programSlug,
        roblox_user_id: Math.trunc(userId),
        username,
        display_name: displayName,
        rank_title: rankTitle,
        delta_rp: Math.max(0, Math.floor(Number(body?.deltaRP ?? body?.delta_rp ?? 0))),
        delta_correct: Math.max(0, Math.floor(Number(body?.deltaCorrect ?? body?.delta_correct ?? 0))),
        best_streak: bestStreak,
        delta_wins: Math.max(0, Math.floor(Number(body?.deltaWins ?? body?.delta_wins ?? 0))),
      });
    }

    const [leaderboard, programLeaderboards] = await Promise.all([
      listLeaderboard(10),
      listProgramLeaderboards(10),
    ]);
    return NextResponse.json({ ok: true, player: saved, leaderboard, programLeaderboards });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan skor pemain" },
      { status: 500 }
    );
  }
}
