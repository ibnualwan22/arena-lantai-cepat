import { NextResponse } from "next/server";
import { listLeaderboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit") || 15);
    const limit = Math.max(1, Math.min(50, Number.isFinite(limitParam) ? Math.floor(limitParam) : 15));
    const leaderboard = await listLeaderboard(limit);
    return NextResponse.json(
      { leaderboard },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memuat leaderboard" },
      { status: 500 }
    );
  }
}
