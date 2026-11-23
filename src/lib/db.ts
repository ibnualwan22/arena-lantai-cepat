import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { DEFAULT_SETTINGS, SEED_CHAPTERS } from "./seed-data";
import type { Chapter, DifficultyPreset, GameSettings, PlayerStat, QuestionMode, Vocabulary } from "./types";

const LOCAL_DB_PATH = path.join(process.cwd(), "data", "local-db.json");

interface LocalStore {
  nextChapterId: number;
  nextVocabId: number;
  chapters: Chapter[];
  vocabularies: Vocabulary[];
  settings: GameSettings;
  playerStats?: PlayerStat[];
}

export function isNeonConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  return Boolean(url && (url.startsWith("postgres://") || url.startsWith("postgresql://")));
}

function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL belum dikonfigurasi");
  }
  return neon(url);
}

// ==================== LOCAL FALLBACK STORE ====================
function readLocalStore(): LocalStore {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const chapters: Chapter[] = [];
    const vocabularies: Vocabulary[] = [];
    let nextChapterId = 1;
    let nextVocabId = 1;

    for (const sc of SEED_CHAPTERS) {
      const chapId = nextChapterId++;
      chapters.push({
        id: chapId,
        slug: sc.slug,
        name: sc.name,
        description: sc.description,
        color: sc.color,
        sort_order: sc.sort_order,
        is_active: true,
      });
      for (const v of sc.vocabularies) {
        vocabularies.push({
          id: nextVocabId++,
          chapter_id: chapId,
          arabic: v.arabic,
          latin: v.latin,
          meaning: v.meaning,
          tip: v.tip,
          sub_group: v.sub_group,
          is_active: true,
        });
      }
    }

    const initial: LocalStore = {
      nextChapterId,
      nextVocabId,
      chapters,
      vocabularies,
      settings: { ...DEFAULT_SETTINGS, updated_at: new Date().toISOString() },
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }

  return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf8")) as LocalStore;
}

function writeLocalStore(store: LocalStore) {
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(store, null, 2), "utf8");
}

// ==================== NEON INITIALIZATION ====================
let neonInitPromise: Promise<void> | null = null;

async function ensureNeonInitialized(): Promise<void> {
  if (!isNeonConfigured()) return;
  if (!neonInitPromise) {
    neonInitPromise = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS chapters (
          id SERIAL PRIMARY KEY,
          slug VARCHAR(64) UNIQUE NOT NULL,
          name VARCHAR(120) NOT NULL,
          description TEXT DEFAULT '',
          color VARCHAR(16) DEFAULT '#10B981',
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS vocabularies (
          id SERIAL PRIMARY KEY,
          chapter_id INT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
          arabic TEXT NOT NULL,
          latin TEXT NOT NULL,
          meaning TEXT NOT NULL,
          tip TEXT DEFAULT '',
          sub_group VARCHAR(64) DEFAULT 'Umum',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS game_settings (
          id INT PRIMARY KEY DEFAULT 1,
          difficulty_preset VARCHAR(32) DEFAULT 'sedang',
          correct_tiles_per_round INT DEFAULT 4,
          choices_per_round INT DEFAULT 4,
          round_time_seconds DOUBLE PRECISION DEFAULT 8.0,
          time_decay_per_round DOUBLE PRECISION DEFAULT 0.3,
          min_round_time_seconds DOUBLE PRECISION DEFAULT 4.5,
          max_rounds INT DEFAULT 10,
          intermission_seconds INT DEFAULT 8,
          question_mode VARCHAR(32) DEFAULT 'auto',
          show_latin_hint BOOLEAN DEFAULT TRUE,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS player_stats (
          roblox_user_id BIGINT PRIMARY KEY,
          username VARCHAR(64) NOT NULL,
          display_name VARCHAR(80) NOT NULL,
          rank_points INT DEFAULT 0,
          rank_title VARCHAR(48) DEFAULT 'Mubtadi''',
          dinar INT DEFAULT 0,
          total_correct INT DEFAULT 0,
          best_streak INT DEFAULT 0,
          wins INT DEFAULT 0,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;

      // Seed default settings row if absent
      await sql`
        INSERT INTO game_settings (
          id, difficulty_preset, correct_tiles_per_round, choices_per_round,
          round_time_seconds, time_decay_per_round, min_round_time_seconds,
          max_rounds, intermission_seconds, question_mode, show_latin_hint
        )
        VALUES (
          1, ${DEFAULT_SETTINGS.difficulty_preset}, ${DEFAULT_SETTINGS.correct_tiles_per_round},
          ${DEFAULT_SETTINGS.choices_per_round}, ${DEFAULT_SETTINGS.round_time_seconds},
          ${DEFAULT_SETTINGS.time_decay_per_round}, ${DEFAULT_SETTINGS.min_round_time_seconds},
          ${DEFAULT_SETTINGS.max_rounds}, ${DEFAULT_SETTINGS.intermission_seconds},
          ${DEFAULT_SETTINGS.question_mode}, ${DEFAULT_SETTINGS.show_latin_hint}
        )
        ON CONFLICT (id) DO NOTHING
      `;

      // Seed initial chapters & mufrodat if database is completely empty
      const existing = await sql`SELECT COUNT(*)::int AS cnt FROM chapters`;
      const count = Number(existing[0]?.cnt ?? 0);
      if (count === 0) {
        for (const sc of SEED_CHAPTERS) {
          const inserted = await sql`
            INSERT INTO chapters (slug, name, description, color, sort_order, is_active)
            VALUES (${sc.slug}, ${sc.name}, ${sc.description}, ${sc.color}, ${sc.sort_order}, TRUE)
            RETURNING id
          `;
          const chapId = Number(inserted[0].id);
          for (const v of sc.vocabularies) {
            await sql`
              INSERT INTO vocabularies (chapter_id, arabic, latin, meaning, tip, sub_group, is_active)
              VALUES (${chapId}, ${v.arabic}, ${v.latin}, ${v.meaning}, ${v.tip}, ${v.sub_group}, TRUE)
            `;
          }
        }
      }
    })().catch((err) => {
      neonInitPromise = null;
      throw err;
    });
  }
  await neonInitPromise;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 56) || `bab-${Date.now()}`
  );
}

// ==================== CHAPTERS CRUD ====================
export async function listChapters(): Promise<Chapter[]> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    return store.chapters
      .map((c) => ({
        ...c,
        vocab_count: store.vocabularies.filter((v) => v.chapter_id === c.id).length,
      }))
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const rows = await sql`
    SELECT c.id, c.slug, c.name, c.description, c.color, c.sort_order, c.is_active,
           COUNT(v.id)::int AS vocab_count
    FROM chapters c
    LEFT JOIN vocabularies v ON v.chapter_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    description: String(r.description ?? ""),
    color: String(r.color ?? "#10B981"),
    sort_order: Number(r.sort_order ?? 0),
    is_active: Boolean(r.is_active),
    vocab_count: Number(r.vocab_count ?? 0),
  }));
}

export async function createChapter(input: {
  name: string;
  description?: string;
  color?: string;
  slug?: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<Chapter> {
  const baseSlug = slugify(input.slug?.trim() || input.name);

  if (!isNeonConfigured()) {
    const store = readLocalStore();
    let finalSlug = baseSlug;
    let suffix = 2;
    while (store.chapters.some((c) => c.slug === finalSlug)) {
      finalSlug = `${baseSlug}-${suffix++}`;
    }
    const created: Chapter = {
      id: store.nextChapterId++,
      slug: finalSlug,
      name: input.name.trim(),
      description: (input.description ?? "").trim(),
      color: input.color || "#10B981",
      sort_order: input.sort_order ?? store.chapters.length + 1,
      is_active: input.is_active ?? true,
      vocab_count: 0,
    };
    store.chapters.push(created);
    writeLocalStore(store);
    return created;
  }

  await ensureNeonInitialized();
  const sql = getSql();
  let finalSlug = baseSlug;
  const dupCheck = await sql`SELECT slug FROM chapters WHERE slug LIKE ${baseSlug + "%"}`;
  const used = new Set(dupCheck.map((r) => String(r.slug)));
  let suffix = 2;
  while (used.has(finalSlug)) {
    finalSlug = `${baseSlug}-${suffix++}`;
  }

  const maxSortRow = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS m FROM chapters`;
  const nextSort = input.sort_order ?? Number(maxSortRow[0]?.m ?? 0) + 1;

  const rows = await sql`
    INSERT INTO chapters (slug, name, description, color, sort_order, is_active)
    VALUES (
      ${finalSlug},
      ${input.name.trim()},
      ${(input.description ?? "").trim()},
      ${input.color || "#10B981"},
      ${nextSort},
      ${input.is_active ?? true}
    )
    RETURNING id, slug, name, description, color, sort_order, is_active
  `;
  const r = rows[0];
  return {
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    description: String(r.description ?? ""),
    color: String(r.color ?? "#10B981"),
    sort_order: Number(r.sort_order ?? 0),
    is_active: Boolean(r.is_active),
    vocab_count: 0,
  };
}

export async function updateChapter(
  id: number,
  patch: Partial<Pick<Chapter, "name" | "description" | "color" | "sort_order" | "is_active">>
): Promise<Chapter | null> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    const idx = store.chapters.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    store.chapters[idx] = {
      ...store.chapters[idx],
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.sort_order !== undefined ? { sort_order: Number(patch.sort_order) } : {}),
      ...(patch.is_active !== undefined ? { is_active: Boolean(patch.is_active) } : {}),
    };
    writeLocalStore(store);
    return store.chapters[idx];
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const curRows = await sql`SELECT * FROM chapters WHERE id = ${id}`;
  if (curRows.length === 0) return null;
  const cur = curRows[0];

  const rows = await sql`
    UPDATE chapters
    SET name = ${patch.name !== undefined ? patch.name.trim() : String(cur.name)},
        description = ${patch.description !== undefined ? patch.description.trim() : String(cur.description ?? "")},
        color = ${patch.color !== undefined ? patch.color : String(cur.color ?? "#10B981")},
        sort_order = ${patch.sort_order !== undefined ? Number(patch.sort_order) : Number(cur.sort_order ?? 0)},
        is_active = ${patch.is_active !== undefined ? Boolean(patch.is_active) : Boolean(cur.is_active)}
    WHERE id = ${id}
    RETURNING id, slug, name, description, color, sort_order, is_active
  `;
  const r = rows[0];
  return {
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    description: String(r.description ?? ""),
    color: String(r.color ?? "#10B981"),
    sort_order: Number(r.sort_order ?? 0),
    is_active: Boolean(r.is_active),
  };
}

export async function deleteChapter(id: number): Promise<boolean> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    const before = store.chapters.length;
    store.chapters = store.chapters.filter((c) => c.id !== id);
    store.vocabularies = store.vocabularies.filter((v) => v.chapter_id !== id);
    writeLocalStore(store);
    return store.chapters.length < before;
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const rows = await sql`DELETE FROM chapters WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ==================== VOCABULARIES CRUD ====================
export async function listVocabularies(chapterId?: number): Promise<Vocabulary[]> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    const list = chapterId
      ? store.vocabularies.filter((v) => v.chapter_id === chapterId)
      : store.vocabularies;
    return [...list].sort((a, b) => a.id - b.id);
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const rows = chapterId
    ? await sql`
        SELECT id, chapter_id, arabic, latin, meaning, tip, sub_group, is_active
        FROM vocabularies
        WHERE chapter_id = ${chapterId}
        ORDER BY id ASC
      `
    : await sql`
        SELECT id, chapter_id, arabic, latin, meaning, tip, sub_group, is_active
        FROM vocabularies
        ORDER BY chapter_id ASC, id ASC
      `;

  return rows.map((r) => ({
    id: Number(r.id),
    chapter_id: Number(r.chapter_id),
    arabic: String(r.arabic),
    latin: String(r.latin),
    meaning: String(r.meaning),
    tip: String(r.tip ?? ""),
    sub_group: String(r.sub_group ?? "Umum"),
    is_active: Boolean(r.is_active),
  }));
}

export async function createVocabularies(
  items: {
    chapter_id: number;
    arabic: string;
    latin: string;
    meaning: string;
    tip?: string;
    sub_group?: string;
    is_active?: boolean;
  }[]
): Promise<Vocabulary[]> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    const created: Vocabulary[] = [];
    for (const item of items) {
      const v: Vocabulary = {
        id: store.nextVocabId++,
        chapter_id: Number(item.chapter_id),
        arabic: item.arabic.trim(),
        latin: item.latin.trim(),
        meaning: item.meaning.trim(),
        tip: (item.tip ?? "").trim(),
        sub_group: (item.sub_group ?? "Umum").trim() || "Umum",
        is_active: item.is_active ?? true,
      };
      store.vocabularies.push(v);
      created.push(v);
    }
    writeLocalStore(store);
    return created;
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const created: Vocabulary[] = [];
  for (const item of items) {
    const rows = await sql`
      INSERT INTO vocabularies (chapter_id, arabic, latin, meaning, tip, sub_group, is_active)
      VALUES (
        ${Number(item.chapter_id)},
        ${item.arabic.trim()},
        ${item.latin.trim()},
        ${item.meaning.trim()},
        ${(item.tip ?? "").trim()},
        ${(item.sub_group ?? "Umum").trim() || "Umum"},
        ${item.is_active ?? true}
      )
      RETURNING id, chapter_id, arabic, latin, meaning, tip, sub_group, is_active
    `;
    const r = rows[0];
    created.push({
      id: Number(r.id),
      chapter_id: Number(r.chapter_id),
      arabic: String(r.arabic),
      latin: String(r.latin),
      meaning: String(r.meaning),
      tip: String(r.tip ?? ""),
      sub_group: String(r.sub_group ?? "Umum"),
      is_active: Boolean(r.is_active),
    });
  }
  return created;
}

export async function updateVocabulary(
  id: number,
  patch: Partial<Pick<Vocabulary, "chapter_id" | "arabic" | "latin" | "meaning" | "tip" | "sub_group" | "is_active">>
): Promise<Vocabulary | null> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    const idx = store.vocabularies.findIndex((v) => v.id === id);
    if (idx === -1) return null;
    store.vocabularies[idx] = {
      ...store.vocabularies[idx],
      ...(patch.chapter_id !== undefined ? { chapter_id: Number(patch.chapter_id) } : {}),
      ...(patch.arabic !== undefined ? { arabic: patch.arabic.trim() } : {}),
      ...(patch.latin !== undefined ? { latin: patch.latin.trim() } : {}),
      ...(patch.meaning !== undefined ? { meaning: patch.meaning.trim() } : {}),
      ...(patch.tip !== undefined ? { tip: patch.tip.trim() } : {}),
      ...(patch.sub_group !== undefined ? { sub_group: patch.sub_group.trim() || "Umum" } : {}),
      ...(patch.is_active !== undefined ? { is_active: Boolean(patch.is_active) } : {}),
    };
    writeLocalStore(store);
    return store.vocabularies[idx];
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const curRows = await sql`SELECT * FROM vocabularies WHERE id = ${id}`;
  if (curRows.length === 0) return null;
  const cur = curRows[0];

  const rows = await sql`
    UPDATE vocabularies
    SET chapter_id = ${patch.chapter_id !== undefined ? Number(patch.chapter_id) : Number(cur.chapter_id)},
        arabic = ${patch.arabic !== undefined ? patch.arabic.trim() : String(cur.arabic)},
        latin = ${patch.latin !== undefined ? patch.latin.trim() : String(cur.latin)},
        meaning = ${patch.meaning !== undefined ? patch.meaning.trim() : String(cur.meaning)},
        tip = ${patch.tip !== undefined ? patch.tip.trim() : String(cur.tip ?? "")},
        sub_group = ${patch.sub_group !== undefined ? (patch.sub_group.trim() || "Umum") : String(cur.sub_group ?? "Umum")},
        is_active = ${patch.is_active !== undefined ? Boolean(patch.is_active) : Boolean(cur.is_active)}
    WHERE id = ${id}
    RETURNING id, chapter_id, arabic, latin, meaning, tip, sub_group, is_active
  `;
  const r = rows[0];
  return {
    id: Number(r.id),
    chapter_id: Number(r.chapter_id),
    arabic: String(r.arabic),
    latin: String(r.latin),
    meaning: String(r.meaning),
    tip: String(r.tip ?? ""),
    sub_group: String(r.sub_group ?? "Umum"),
    is_active: Boolean(r.is_active),
  };
}

export async function deleteVocabulary(id: number): Promise<boolean> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    const before = store.vocabularies.length;
    store.vocabularies = store.vocabularies.filter((v) => v.id !== id);
    writeLocalStore(store);
    return store.vocabularies.length < before;
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const rows = await sql`DELETE FROM vocabularies WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ==================== GAME & DIFFICULTY SETTINGS ====================
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export async function getGameSettings(): Promise<GameSettings> {
  if (!isNeonConfigured()) {
    return readLocalStore().settings;
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const rows = await sql`SELECT * FROM game_settings WHERE id = 1`;
  if (rows.length === 0) return DEFAULT_SETTINGS;
  const r = rows[0];
  return {
    id: 1,
    difficulty_preset: (r.difficulty_preset as DifficultyPreset) || "sedang",
    correct_tiles_per_round: Number(r.correct_tiles_per_round ?? 4),
    choices_per_round: Number(r.choices_per_round ?? 4),
    round_time_seconds: Number(r.round_time_seconds ?? 8.0),
    time_decay_per_round: Number(r.time_decay_per_round ?? 0.3),
    min_round_time_seconds: Number(r.min_round_time_seconds ?? 4.5),
    max_rounds: Number(r.max_rounds ?? 10),
    intermission_seconds: Number(r.intermission_seconds ?? 8),
    question_mode: (r.question_mode as QuestionMode) || "auto",
    show_latin_hint: Boolean(r.show_latin_hint ?? true),
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
  };
}

export async function updateGameSettings(patch: Partial<GameSettings>): Promise<GameSettings> {
  const cur = await getGameSettings();

  const choices = Math.round(clamp(Number(patch.choices_per_round ?? cur.choices_per_round), 2, 4));
  // Ensure at least 1 tile per distractor choice remains out of 16 tiles!
  const maxAllowedCorrect = 16 - (choices - 1);
  const correctTiles = Math.round(
    clamp(Number(patch.correct_tiles_per_round ?? cur.correct_tiles_per_round), 1, Math.min(12, maxAllowedCorrect))
  );
  const roundTime = Number(clamp(Number(patch.round_time_seconds ?? cur.round_time_seconds), 3.0, 20.0).toFixed(1));
  const minTime = Number(
    clamp(Number(patch.min_round_time_seconds ?? cur.min_round_time_seconds), 2.5, roundTime).toFixed(1)
  );
  const decay = Number(clamp(Number(patch.time_decay_per_round ?? cur.time_decay_per_round), 0.0, 1.5).toFixed(2));
  const maxRounds = Math.round(clamp(Number(patch.max_rounds ?? cur.max_rounds), 3, 25));
  const intermission = Math.round(clamp(Number(patch.intermission_seconds ?? cur.intermission_seconds), 3, 30));

  const next: GameSettings = {
    id: 1,
    difficulty_preset: (patch.difficulty_preset ?? cur.difficulty_preset) as DifficultyPreset,
    correct_tiles_per_round: correctTiles,
    choices_per_round: choices,
    round_time_seconds: roundTime,
    time_decay_per_round: decay,
    min_round_time_seconds: minTime,
    max_rounds: maxRounds,
    intermission_seconds: intermission,
    question_mode: (patch.question_mode ?? cur.question_mode) as QuestionMode,
    show_latin_hint: patch.show_latin_hint !== undefined ? Boolean(patch.show_latin_hint) : cur.show_latin_hint,
    updated_at: new Date().toISOString(),
  };

  if (!isNeonConfigured()) {
    const store = readLocalStore();
    store.settings = next;
    writeLocalStore(store);
    return next;
  }

  await ensureNeonInitialized();
  const sql = getSql();
  await sql`
    UPDATE game_settings
    SET difficulty_preset = ${next.difficulty_preset},
        correct_tiles_per_round = ${next.correct_tiles_per_round},
        choices_per_round = ${next.choices_per_round},
        round_time_seconds = ${next.round_time_seconds},
        time_decay_per_round = ${next.time_decay_per_round},
        min_round_time_seconds = ${next.min_round_time_seconds},
        max_rounds = ${next.max_rounds},
        intermission_seconds = ${next.intermission_seconds},
        question_mode = ${next.question_mode},
        show_latin_hint = ${next.show_latin_hint},
        updated_at = NOW()
    WHERE id = 1
  `;
  return next;
}

// ==================== COMPETITIVE PLAYER STATS & LEADERBOARD ====================
const EXCLUDED_DEV_USERNAMES = new Set(["minazuki705"]);

export async function upsertPlayerStat(stat: Omit<PlayerStat, "updated_at">): Promise<PlayerStat> {
  const now = new Date().toISOString();
  if (EXCLUDED_DEV_USERNAMES.has(stat.username.toLowerCase())) {
    return { ...stat, updated_at: now };
  }
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    if (!store.playerStats) store.playerStats = [];
    const idx = store.playerStats.findIndex((p) => p.roblox_user_id === stat.roblox_user_id);
    const merged: PlayerStat = {
      roblox_user_id: stat.roblox_user_id,
      username: stat.username,
      display_name: stat.display_name,
      rank_points: idx >= 0 ? Math.max(store.playerStats[idx].rank_points, stat.rank_points) : stat.rank_points,
      rank_title: stat.rank_title,
      dinar: stat.dinar,
      total_correct: idx >= 0 ? Math.max(store.playerStats[idx].total_correct, stat.total_correct) : stat.total_correct,
      best_streak: idx >= 0 ? Math.max(store.playerStats[idx].best_streak, stat.best_streak) : stat.best_streak,
      wins: idx >= 0 ? Math.max(store.playerStats[idx].wins, stat.wins) : stat.wins,
      updated_at: now,
    };
    if (idx >= 0) store.playerStats[idx] = merged;
    else store.playerStats.push(merged);
    writeLocalStore(store);
    return merged;
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO player_stats (
      roblox_user_id, username, display_name, rank_points, rank_title,
      dinar, total_correct, best_streak, wins, updated_at
    )
    VALUES (
      ${stat.roblox_user_id}, ${stat.username}, ${stat.display_name},
      ${stat.rank_points}, ${stat.rank_title}, ${stat.dinar},
      ${stat.total_correct}, ${stat.best_streak}, ${stat.wins}, NOW()
    )
    ON CONFLICT (roblox_user_id) DO UPDATE SET
      username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      rank_points = GREATEST(player_stats.rank_points, EXCLUDED.rank_points),
      rank_title = EXCLUDED.rank_title,
      dinar = EXCLUDED.dinar,
      total_correct = GREATEST(player_stats.total_correct, EXCLUDED.total_correct),
      best_streak = GREATEST(player_stats.best_streak, EXCLUDED.best_streak),
      wins = GREATEST(player_stats.wins, EXCLUDED.wins),
      updated_at = NOW()
    RETURNING roblox_user_id, username, display_name, rank_points, rank_title, dinar, total_correct, best_streak, wins, updated_at
  `;
  const r = rows[0];
  return {
    roblox_user_id: Number(r.roblox_user_id),
    username: String(r.username),
    display_name: String(r.display_name),
    rank_points: Number(r.rank_points ?? 0),
    rank_title: String(r.rank_title ?? "Mubtadi'"),
    dinar: Number(r.dinar ?? 0),
    total_correct: Number(r.total_correct ?? 0),
    best_streak: Number(r.best_streak ?? 0),
    wins: Number(r.wins ?? 0),
    updated_at: r.updated_at ? String(r.updated_at) : now,
  };
}

export async function listLeaderboard(limit = 15): Promise<PlayerStat[]> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    return [...(store.playerStats || [])]
      .filter((p) => !EXCLUDED_DEV_USERNAMES.has(p.username.toLowerCase()))
      .sort((a, b) => b.rank_points - a.rank_points || b.wins - a.wins)
      .slice(0, limit);
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const rows = await sql`
    SELECT roblox_user_id, username, display_name, rank_points, rank_title,
           dinar, total_correct, best_streak, wins, updated_at
    FROM player_stats
    WHERE LOWER(username) <> 'minazuki705'
    ORDER BY rank_points DESC, wins DESC, total_correct DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    roblox_user_id: Number(r.roblox_user_id),
    username: String(r.username),
    display_name: String(r.display_name),
    rank_points: Number(r.rank_points ?? 0),
    rank_title: String(r.rank_title ?? "Mubtadi'"),
    dinar: Number(r.dinar ?? 0),
    total_correct: Number(r.total_correct ?? 0),
    best_streak: Number(r.best_streak ?? 0),
    wins: Number(r.wins ?? 0),
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
  }));
}
