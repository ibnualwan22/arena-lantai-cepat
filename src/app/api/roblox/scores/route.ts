import { NextResponse } from "next/server";
import { listLeaderboard, upsertPlayerStat } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = Number(body?.userId ?? body?.roblox_user_id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "userId tidak valid" }, { status: 400 });
    }
    const saved = await upsertPlayerStat({
      roblox_user_id: Math.trunc(userId),
      username: String(body?.username || `Player_${userId}`).slice(0, 64),
      display_name: String(body?.displayName || body?.display_name || body?.username || "Pemain").slice(0, 80),
      rank_points: Math.max(0, Math.floor(Number(body?.rankPoints ?? body?.rank_points ?? 0))),
      rank_title: String(body?.rankTitle || body?.rank_title || "Mubtadi'").slice(0, 48),
      dinar: Math.max(0, Math.floor(Number(body?.dinar ?? 0))),
      total_correct: Math.max(0, Math.floor(Number(body?.totalCorrect ?? body?.total_correct ?? 0))),
      best_streak: Math.max(0, Math.floor(Number(body?.bestStreak ?? body?.best_streak ?? 0))),
      wins: Math.max(0, Math.floor(Number(body?.wins ?? 0))),
    });
    const leaderboard = await listLeaderboard(10);
    return NextResponse.json({ ok: true, player: saved, leaderboard });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan skor pemain" },
      { status: 500 }
    );
  }
}
