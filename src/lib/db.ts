import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import { DEFAULT_SETTINGS, SEED_PROGRAMS } from "./seed-data";
import type {
  Chapter,
  CustomSession,
  DifficultyPreset,
  GameSettings,
  PlayerStat,
  Program,
  ProgramLeaderboard,
  QuestionMode,
  Vocabulary,
} from "./types";

const LOCAL_DB_PATH = path.join(process.cwd(), "data", "local-db.json");

interface ProgramStatRow {
  program_id: number;
  roblox_user_id: number;
  username: string;
  display_name: string;
  rank_points: number;
  rank_title: string;
  total_correct: number;
  best_streak: number;
  wins: number;
  updated_at: string;
}

interface LocalStore {
  nextProgramId?: number;
  nextChapterId: number;
  nextVocabId: number;
  nextSessionId?: number;
  programs?: Program[];
  chapters: Chapter[];
  vocabularies: Vocabulary[];
  customSessions?: CustomSession[];
  settings: GameSettings;
  playerStats?: PlayerStat[];
  programPlayerStats?: ProgramStatRow[];
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
    const programs: Program[] = [];
    const chapters: Chapter[] = [];
    const vocabularies: Vocabulary[] = [];
    let nextProgramId = 1;
    let nextChapterId = 1;
    let nextVocabId = 1;

    for (const sp of SEED_PROGRAMS) {
      const progId = nextProgramId++;
      programs.push({
        id: progId,
        slug: sp.slug,
        name: sp.name,
        description: sp.description,
        color: sp.color,
        sort_order: sp.sort_order,
        is_active: true,
      });
      for (const sc of sp.chapters) {
        const chapId = nextChapterId++;
        chapters.push({
          id: chapId,
          program_id: progId,
          chapter_number: sc.chapter_number,
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
            latin: v.latin ?? "",
            meaning: v.meaning,
            tip: v.tip ?? "",
            sub_group: v.sub_group ?? sc.name,
            is_active: true,
          });
        }
      }
    }

    const initial: LocalStore = {
      nextProgramId,
      nextChapterId,
      nextVocabId,
      nextSessionId: 1,
      programs,
      chapters,
      vocabularies,
      customSessions: [],
      settings: { ...DEFAULT_SETTINGS, updated_at: new Date().toISOString() },
      playerStats: [],
      programPlayerStats: [],
    };
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }

  const parsed = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf8")) as LocalStore;
  let dirty = false;

  // Seamless migration for older local-db.json without programs / chapter_number
  if (!parsed.programs || parsed.programs.length === 0) {
    parsed.programs = [
      {
        id: 1,
        slug: "program-utama",
        name: "Program Bahasa Arab Utama",
        description: "Program utama (hasil migrasi otomatis bab sebelumnya).",
        color: "#10B981",
        sort_order: 1,
        is_active: true,
      },
    ];
    parsed.nextProgramId = 2;
    dirty = true;
  }
  const defaultProgId = parsed.programs[0].id;
  parsed.chapters.forEach((c, idx) => {
    if (!c.program_id) {
      c.program_id = defaultProgId;
      dirty = true;
    }
    if (!c.chapter_number) {
      c.chapter_number = c.sort_order || idx + 1;
      dirty = true;
    }
  });
  if (!parsed.customSessions) {
    parsed.customSessions = [];
    parsed.nextSessionId = 1;
    dirty = true;
  }
  if (!parsed.programPlayerStats) {
    parsed.programPlayerStats = [];
    dirty = true;
  }
  if (!parsed.nextProgramId) {
    parsed.nextProgramId = Math.max(0, ...parsed.programs.map((p) => p.id)) + 1;
    dirty = true;
  }
  if (!parsed.nextSessionId) {
    parsed.nextSessionId = Math.max(0, ...parsed.customSessions.map((s) => s.id)) + 1;
    dirty = true;
  }
  if (dirty) writeLocalStore(parsed);
  return parsed;
}

function writeLocalStore(store: LocalStore) {
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(store, null, 2), "utf8");
}

// ==================== NEON INITIALIZATION & NON-DESTRUCTIVE MIGRATION ====================
let neonInitPromise: Promise<void> | null = null;

async function ensureNeonInitialized(): Promise<void> {
  if (!isNeonConfigured()) return;
  if (!neonInitPromise) {
    neonInitPromise = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS programs (
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
        CREATE TABLE IF NOT EXISTS chapters (
          id SERIAL PRIMARY KEY,
          program_id INT REFERENCES programs(id) ON DELETE CASCADE,
          chapter_number INT NOT NULL DEFAULT 1,
          slug VARCHAR(64) UNIQUE NOT NULL,
          name VARCHAR(120) NOT NULL,
          description TEXT DEFAULT '',
          color VARCHAR(16) DEFAULT '#10B981',
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      // Safe migrations for existing Neon tables
      await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS program_id INT REFERENCES programs(id) ON DELETE CASCADE`;
      await sql`ALTER TABLE chapters ADD COLUMN IF NOT EXISTS chapter_number INT NOT NULL DEFAULT 1`;

      await sql`
        CREATE TABLE IF NOT EXISTS vocabularies (
          id SERIAL PRIMARY KEY,
          chapter_id INT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
          arabic TEXT NOT NULL,
          latin TEXT DEFAULT '',
          meaning TEXT NOT NULL,
          tip TEXT DEFAULT '',
          sub_group VARCHAR(64) DEFAULT 'Umum',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      await sql`ALTER TABLE vocabularies ALTER COLUMN latin SET DEFAULT ''`;
      try {
        await sql`ALTER TABLE vocabularies ALTER COLUMN latin DROP NOT NULL`;
      } catch {
        // already nullable
      }

      await sql`
        CREATE TABLE IF NOT EXISTS custom_sessions (
          id SERIAL PRIMARY KEY,
          code VARCHAR(16) UNIQUE NOT NULL,
          title VARCHAR(120) NOT NULL,
          program_id INT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
          chapter_from INT NOT NULL DEFAULT 1,
          chapter_to INT NOT NULL DEFAULT 1,
          difficulty_preset VARCHAR(32) DEFAULT 'sedang',
          correct_tiles_per_round INT DEFAULT 4,
          choices_per_round INT DEFAULT 4,
          round_time_seconds DOUBLE PRECISION DEFAULT 8.0,
          time_decay_per_round DOUBLE PRECISION DEFAULT 0.3,
          min_round_time_seconds DOUBLE PRECISION DEFAULT 5.0,
          max_rounds INT DEFAULT 10,
          intermission_seconds INT DEFAULT 8,
          question_mode VARCHAR(32) DEFAULT 'auto',
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
          show_latin_hint BOOLEAN DEFAULT FALSE,
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
      await sql`
        CREATE TABLE IF NOT EXISTS program_player_stats (
          program_id INT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
          roblox_user_id BIGINT NOT NULL,
          username VARCHAR(64) NOT NULL,
          display_name VARCHAR(80) NOT NULL,
          rank_points INT DEFAULT 0,
          rank_title VARCHAR(48) DEFAULT 'Mubtadi''',
          total_correct INT DEFAULT 0,
          best_streak INT DEFAULT 0,
          wins INT DEFAULT 0,
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          PRIMARY KEY (program_id, roblox_user_id)
        )
      `;

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

      // Ensure at least one program exists, and migrate any orphan chapters into it
      const progCountRow = await sql`SELECT COUNT(*)::int AS cnt FROM programs`;
      const progCount = Number(progCountRow[0]?.cnt ?? 0);
      const chapCountRow = await sql`SELECT COUNT(*)::int AS cnt FROM chapters`;
      const chapCount = Number(chapCountRow[0]?.cnt ?? 0);

      if (progCount === 0) {
        if (chapCount > 0) {
          // Existing DB already had chapters -> create default program & attach them!
          const defProg = await sql`
            INSERT INTO programs (slug, name, description, color, sort_order, is_active)
            VALUES ('program-utama', 'Program Bahasa Arab Utama', 'Program utama berisi seluruh bab materi yang sudah ada.', '#10B981', 1, TRUE)
            RETURNING id
          `;
          const defProgId = Number(defProg[0].id);
          await sql`
            UPDATE chapters
            SET program_id = ${defProgId},
                chapter_number = GREATEST(1, COALESCE(NULLIF(sort_order, 0), id))
            WHERE program_id IS NULL
          `;
        } else {
          // Fresh DB -> seed default program, chapters, and vocabularies!
          for (const sp of SEED_PROGRAMS) {
            const pIns = await sql`
              INSERT INTO programs (slug, name, description, color, sort_order, is_active)
              VALUES (${sp.slug}, ${sp.name}, ${sp.description}, ${sp.color}, ${sp.sort_order}, TRUE)
              RETURNING id
            `;
            const progId = Number(pIns[0].id);
            for (const sc of sp.chapters) {
              const cIns = await sql`
                INSERT INTO chapters (program_id, chapter_number, slug, name, description, color, sort_order, is_active)
                VALUES (${progId}, ${sc.chapter_number}, ${sc.slug}, ${sc.name}, ${sc.description}, ${sc.color}, ${sc.sort_order}, TRUE)
                RETURNING id
              `;
              const chapId = Number(cIns[0].id);
              for (const v of sc.vocabularies) {
                await sql`
                  INSERT INTO vocabularies (chapter_id, arabic, latin, meaning, tip, sub_group, is_active)
                  VALUES (${chapId}, ${v.arabic}, ${v.latin ?? ""}, ${v.meaning}, ${v.tip ?? ""}, ${v.sub_group ?? sc.name}, TRUE)
                `;
              }
            }
          }
        }
      } else {
        // Attach any stray chapters with NULL program_id to first program
        const firstProg = await sql`SELECT id FROM programs ORDER BY sort_order ASC, id ASC LIMIT 1`;
        if (firstProg.length > 0) {
          const firstId = Number(firstProg[0].id);
          await sql`UPDATE chapters SET program_id = ${firstId} WHERE program_id IS NULL`;
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
      .slice(0, 56) || `item-${Date.now()}`
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ==================== PROGRAMS CRUD ====================
export async function listPrograms(): Promise<Program[]> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    return (store.programs || [])
      .map((p) => {
        const chaps = store.chapters.filter((c) => c.program_id === p.id);
        const chapIds = new Set(chaps.map((c) => c.id));
        const vocabCount = store.vocabularies.filter((v) => chapIds.has(v.chapter_id)).length;
        return {
          ...p,
          chapter_count: chaps.length,
          vocab_count: vocabCount,
        };
      })
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const rows = await sql`
    SELECT p.id, p.slug, p.name, p.description, p.color, p.sort_order, p.is_active,
           COUNT(DISTINCT c.id)::int AS chapter_count,
           COUNT(v.id)::int AS vocab_count
    FROM programs p
    LEFT JOIN chapters c ON c.program_id = p.id
    LEFT JOIN vocabularies v ON v.chapter_id = c.id
    GROUP BY p.id
    ORDER BY p.sort_order ASC, p.id ASC
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    description: String(r.description ?? ""),
    color: String(r.color ?? "#10B981"),
    sort_order: Number(r.sort_order ?? 0),
    is_active: Boolean(r.is_active),
    chapter_count: Number(r.chapter_count ?? 0),
    vocab_count: Number(r.vocab_count ?? 0),
  }));
}

export async function createProgram(input: {
  name: string;
  description?: string;
  color?: string;
  slug?: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<Program> {
  const baseSlug = slugify(input.slug?.trim() || input.name);

  if (!isNeonConfigured()) {
    const store = readLocalStore();
    if (!store.programs) store.programs = [];
    let finalSlug = baseSlug;
    let suffix = 2;
    while (store.programs.some((p) => p.slug === finalSlug)) {
      finalSlug = `${baseSlug}-${suffix++}`;
    }
    const created: Program = {
      id: (store.nextProgramId = (store.nextProgramId || 1) + 1) - 1,
      slug: finalSlug,
      name: input.name.trim(),
      description: (input.description ?? "").trim(),
      color: input.color || "#10B981",
      sort_order: input.sort_order ?? store.programs.length + 1,
      is_active: input.is_active ?? true,
      chapter_count: 0,
      vocab_count: 0,
    };
    store.programs.push(created);
    writeLocalStore(store);
    return created;
  }

  await ensureNeonInitialized();
  const sql = getSql();
  let finalSlug = baseSlug;
  const dupCheck = await sql`SELECT slug FROM programs WHERE slug LIKE ${baseSlug + "%"}`;
  const used = new Set(dupCheck.map((r) => String(r.slug)));
  let suffix = 2;
  while (used.has(finalSlug)) finalSlug = `${baseSlug}-${suffix++}`;

  const maxSortRow = await sql`SELECT COALESCE(MAX(sort_order), 0)::int AS m FROM programs`;
  const nextSort = input.sort_order ?? Number(maxSortRow[0]?.m ?? 0) + 1;

  const rows = await sql`
    INSERT INTO programs (slug, name, description, color, sort_order, is_active)
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
    chapter_count: 0,
    vocab_count: 0,
  };
}

export async function updateProgram(
  id: number,
  patch: Partial<Pick<Program, "name" | "description" | "color" | "sort_order" | "is_active">>
): Promise<Program | null> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    if (!store.programs) return null;
    const idx = store.programs.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    store.programs[idx] = {
      ...store.programs[idx],
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description.trim() } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.sort_order !== undefined ? { sort_order: Number(patch.sort_order) } : {}),
      ...(patch.is_active !== undefined ? { is_active: Boolean(patch.is_active) } : {}),
    };
    writeLocalStore(store);
    return store.programs[idx];
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const curRows = await sql`SELECT * FROM programs WHERE id = ${id}`;
  if (curRows.length === 0) return null;
  const cur = curRows[0];

  const rows = await sql`
    UPDATE programs
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

export async function deleteProgram(id: number): Promise<boolean> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    if (!store.programs) return false;
    const before = store.programs.length;
    store.programs = store.programs.filter((p) => p.id !== id);
    const removedChapIds = new Set(store.chapters.filter((c) => c.program_id === id).map((c) => c.id));
    store.chapters = store.chapters.filter((c) => c.program_id !== id);
    store.vocabularies = store.vocabularies.filter((v) => !removedChapIds.has(v.chapter_id));
    store.customSessions = (store.customSessions || []).filter((s) => s.program_id !== id);
    store.programPlayerStats = (store.programPlayerStats || []).filter((ps) => ps.program_id !== id);
    writeLocalStore(store);
    return store.programs.length < before;
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const rows = await sql`DELETE FROM programs WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ==================== CHAPTERS CRUD ====================
export async function listChapters(programId?: number): Promise<Chapter[]> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    const list = programId
      ? store.chapters.filter((c) => c.program_id === programId)
      : store.chapters;
    return list
      .map((c) => ({
        ...c,
        vocab_count: store.vocabularies.filter((v) => v.chapter_id === c.id).length,
      }))
      .sort((a, b) => a.program_id - b.program_id || a.chapter_number - b.chapter_number || a.sort_order - b.sort_order || a.id - b.id);
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const rows = programId
    ? await sql`
        SELECT c.id, c.program_id, c.chapter_number, c.slug, c.name, c.description, c.color, c.sort_order, c.is_active,
               COUNT(v.id)::int AS vocab_count
        FROM chapters c
        LEFT JOIN vocabularies v ON v.chapter_id = c.id
        WHERE c.program_id = ${programId}
        GROUP BY c.id
        ORDER BY c.chapter_number ASC, c.sort_order ASC, c.id ASC
      `
    : await sql`
        SELECT c.id, c.program_id, c.chapter_number, c.slug, c.name, c.description, c.color, c.sort_order, c.is_active,
               COUNT(v.id)::int AS vocab_count
        FROM chapters c
        LEFT JOIN vocabularies v ON v.chapter_id = c.id
        GROUP BY c.id
        ORDER BY c.program_id ASC, c.chapter_number ASC, c.sort_order ASC, c.id ASC
      `;
  return rows.map((r) => ({
    id: Number(r.id),
    program_id: Number(r.program_id ?? 1),
    chapter_number: Number(r.chapter_number ?? 1),
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
  program_id?: number;
  chapter_number?: number;
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
    const progId = Number(input.program_id || store.programs?.[0]?.id || 1);
    const sameProgChaps = store.chapters.filter((c) => c.program_id === progId);
    const nextNum =
      input.chapter_number !== undefined && Number.isFinite(Number(input.chapter_number))
        ? Math.max(1, Math.floor(Number(input.chapter_number)))
        : Math.max(0, ...sameProgChaps.map((c) => c.chapter_number || 0)) + 1;

    let finalSlug = baseSlug;
    let suffix = 2;
    while (store.chapters.some((c) => c.slug === finalSlug)) {
      finalSlug = `${baseSlug}-${suffix++}`;
    }
    const created: Chapter = {
      id: store.nextChapterId++,
      program_id: progId,
      chapter_number: nextNum,
      slug: finalSlug,
      name: input.name.trim(),
      description: (input.description ?? "").trim(),
      color: input.color || "#10B981",
      sort_order: input.sort_order ?? nextNum,
      is_active: input.is_active ?? true,
      vocab_count: 0,
    };
    store.chapters.push(created);
    writeLocalStore(store);
    return created;
  }

  await ensureNeonInitialized();
  const sql = getSql();

  let progId = input.program_id ? Number(input.program_id) : 0;
  if (!progId) {
    const first = await sql`SELECT id FROM programs ORDER BY sort_order ASC, id ASC LIMIT 1`;
    progId = Number(first[0]?.id ?? 1);
  }

  let finalSlug = baseSlug;
  const dupCheck = await sql`SELECT slug FROM chapters WHERE slug LIKE ${baseSlug + "%"}`;
  const used = new Set(dupCheck.map((r) => String(r.slug)));
  let suffix = 2;
  while (used.has(finalSlug)) finalSlug = `${baseSlug}-${suffix++}`;

  const maxNumRow = await sql`SELECT COALESCE(MAX(chapter_number), 0)::int AS m FROM chapters WHERE program_id = ${progId}`;
  const nextNum =
    input.chapter_number !== undefined && Number.isFinite(Number(input.chapter_number))
      ? Math.max(1, Math.floor(Number(input.chapter_number)))
      : Number(maxNumRow[0]?.m ?? 0) + 1;

  const rows = await sql`
    INSERT INTO chapters (program_id, chapter_number, slug, name, description, color, sort_order, is_active)
    VALUES (
      ${progId},
      ${nextNum},
      ${finalSlug},
      ${input.name.trim()},
      ${(input.description ?? "").trim()},
      ${input.color || "#10B981"},
      ${input.sort_order ?? nextNum},
      ${input.is_active ?? true}
    )
    RETURNING id, program_id, chapter_number, slug, name, description, color, sort_order, is_active
  `;
  const r = rows[0];
  return {
    id: Number(r.id),
    program_id: Number(r.program_id),
    chapter_number: Number(r.chapter_number),
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
  patch: Partial<Pick<Chapter, "program_id" | "chapter_number" | "name" | "description" | "color" | "sort_order" | "is_active">>
): Promise<Chapter | null> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    const idx = store.chapters.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    store.chapters[idx] = {
      ...store.chapters[idx],
      ...(patch.program_id !== undefined ? { program_id: Number(patch.program_id) } : {}),
      ...(patch.chapter_number !== undefined ? { chapter_number: Math.max(1, Math.floor(Number(patch.chapter_number))) } : {}),
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
    SET program_id = ${patch.program_id !== undefined ? Number(patch.program_id) : Number(cur.program_id)},
        chapter_number = ${patch.chapter_number !== undefined ? Math.max(1, Math.floor(Number(patch.chapter_number))) : Number(cur.chapter_number ?? 1)},
        name = ${patch.name !== undefined ? patch.name.trim() : String(cur.name)},
        description = ${patch.description !== undefined ? patch.description.trim() : String(cur.description ?? "")},
        color = ${patch.color !== undefined ? patch.color : String(cur.color ?? "#10B981")},
        sort_order = ${patch.sort_order !== undefined ? Number(patch.sort_order) : Number(cur.sort_order ?? 0)},
        is_active = ${patch.is_active !== undefined ? Boolean(patch.is_active) : Boolean(cur.is_active)}
    WHERE id = ${id}
    RETURNING id, program_id, chapter_number, slug, name, description, color, sort_order, is_active
  `;
  const r = rows[0];
  return {
    id: Number(r.id),
    program_id: Number(r.program_id),
    chapter_number: Number(r.chapter_number),
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

// ==================== VOCABULARIES CRUD (Arab + Arti saja; latin opsional) ====================
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
        SELECT id, chapter_id, arabic, COALESCE(latin, '') AS latin, meaning, tip, sub_group, is_active
        FROM vocabularies
        WHERE chapter_id = ${chapterId}
        ORDER BY id ASC
      `
    : await sql`
        SELECT id, chapter_id, arabic, COALESCE(latin, '') AS latin, meaning, tip, sub_group, is_active
        FROM vocabularies
        ORDER BY chapter_id ASC, id ASC
      `;

  return rows.map((r) => ({
    id: Number(r.id),
    chapter_id: Number(r.chapter_id),
    arabic: String(r.arabic),
    latin: String(r.latin ?? ""),
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
    latin?: string;
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
        latin: (item.latin ?? "").trim(),
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
        ${(item.latin ?? "").trim()},
        ${item.meaning.trim()},
        ${(item.tip ?? "").trim()},
        ${(item.sub_group ?? "Umum").trim() || "Umum"},
        ${item.is_active ?? true}
      )
      RETURNING id, chapter_id, arabic, COALESCE(latin, '') AS latin, meaning, tip, sub_group, is_active
    `;
    const r = rows[0];
    created.push({
      id: Number(r.id),
      chapter_id: Number(r.chapter_id),
      arabic: String(r.arabic),
      latin: String(r.latin ?? ""),
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
        latin = ${patch.latin !== undefined ? patch.latin.trim() : String(cur.latin ?? "")},
        meaning = ${patch.meaning !== undefined ? patch.meaning.trim() : String(cur.meaning)},
        tip = ${patch.tip !== undefined ? patch.tip.trim() : String(cur.tip ?? "")},
        sub_group = ${patch.sub_group !== undefined ? (patch.sub_group.trim() || "Umum") : String(cur.sub_group ?? "Umum")},
        is_active = ${patch.is_active !== undefined ? Boolean(patch.is_active) : Boolean(cur.is_active)}
    WHERE id = ${id}
    RETURNING id, chapter_id, arabic, COALESCE(latin, '') AS latin, meaning, tip, sub_group, is_active
  `;
  const r = rows[0];
  return {
    id: Number(r.id),
    chapter_id: Number(r.chapter_id),
    arabic: String(r.arabic),
    latin: String(r.latin ?? ""),
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

// ==================== CUSTOM SESSIONS CRUD (Mode Kustom Sesi Kelas) ====================
function generateSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function listCustomSessions(): Promise<CustomSession[]> {
  const [programs, chapters, vocabs] = await Promise.all([
    listPrograms(),
    listChapters(),
    listVocabularies(),
  ]);
  const progMap = new Map(programs.map((p) => [p.id, p]));

  const countVocabsForSession = (programId: number, fromNum: number, toNum: number) => {
    const matchingChaps = new Set(
      chapters
        .filter((c) => c.program_id === programId && c.is_active && c.chapter_number >= fromNum && c.chapter_number <= toNum)
        .map((c) => c.id)
    );
    return vocabs.filter((v) => v.is_active && matchingChaps.has(v.chapter_id)).length;
  };

  if (!isNeonConfigured()) {
    const store = readLocalStore();
    return [...(store.customSessions || [])]
      .sort((a, b) => b.id - a.id)
      .map((s) => {
        const prog = progMap.get(s.program_id);
        return {
          ...s,
          program_name: prog?.name || "Program",
          program_slug: prog?.slug || "",
          program_color: prog?.color || "#10B981",
          vocab_count: countVocabsForSession(s.program_id, s.chapter_from, s.chapter_to),
        };
      });
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM custom_sessions
    ORDER BY id DESC
  `;
  return rows.map((r) => {
    const programId = Number(r.program_id);
    const chFrom = Number(r.chapter_from ?? 1);
    const chTo = Number(r.chapter_to ?? 1);
    const prog = progMap.get(programId);
    return {
      id: Number(r.id),
      code: String(r.code),
      title: String(r.title),
      program_id: programId,
      program_name: prog?.name || "Program",
      program_slug: prog?.slug || "",
      program_color: prog?.color || "#10B981",
      chapter_from: chFrom,
      chapter_to: chTo,
      difficulty_preset: (r.difficulty_preset as DifficultyPreset) || "sedang",
      correct_tiles_per_round: Number(r.correct_tiles_per_round ?? 4),
      choices_per_round: Number(r.choices_per_round ?? 4),
      round_time_seconds: Number(r.round_time_seconds ?? 8.0),
      time_decay_per_round: Number(r.time_decay_per_round ?? 0.3),
      min_round_time_seconds: Number(r.min_round_time_seconds ?? 5.0),
      max_rounds: Number(r.max_rounds ?? 10),
      intermission_seconds: Number(r.intermission_seconds ?? 8),
      question_mode: (r.question_mode as QuestionMode) || "auto",
      is_active: Boolean(r.is_active),
      vocab_count: countVocabsForSession(programId, chFrom, chTo),
      created_at: r.created_at ? String(r.created_at) : undefined,
    };
  });
}

export async function getCustomSessionByCode(rawCode: string): Promise<CustomSession | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;
  const all = await listCustomSessions();
  return all.find((s) => s.code.toUpperCase() === code) ?? null;
}

export async function createCustomSession(input: {
  title: string;
  program_id: number;
  chapter_from: number;
  chapter_to: number;
  code?: string;
  difficulty_preset?: DifficultyPreset;
  correct_tiles_per_round?: number;
  choices_per_round?: number;
  round_time_seconds?: number;
  time_decay_per_round?: number;
  min_round_time_seconds?: number;
  max_rounds?: number;
  intermission_seconds?: number;
  question_mode?: QuestionMode;
}): Promise<CustomSession> {
  const chFrom = Math.max(1, Math.floor(Number(input.chapter_from || 1)));
  const chTo = Math.max(chFrom, Math.floor(Number(input.chapter_to || chFrom)));
  const choices = Math.round(clamp(Number(input.choices_per_round ?? 4), 2, 4));
  const correctTiles = Math.round(clamp(Number(input.correct_tiles_per_round ?? 4), 1, Math.min(12, 16 - (choices - 1))));
  const roundTime = Number(clamp(Number(input.round_time_seconds ?? 8.0), 3.0, 20.0).toFixed(1));
  const minTime = Number(clamp(Number(input.min_round_time_seconds ?? 5.0), 2.5, roundTime).toFixed(1));
  const decay = Number(clamp(Number(input.time_decay_per_round ?? 0.3), 0.0, 1.5).toFixed(2));
  const maxRounds = Math.round(clamp(Number(input.max_rounds ?? 10), 3, 25));
  const intermission = Math.round(clamp(Number(input.intermission_seconds ?? 8), 3, 30));
  const preset = (input.difficulty_preset || "sedang") as DifficultyPreset;
  const qMode = (input.question_mode || "auto") as QuestionMode;

  let code = (input.code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  if (code.length < 4) code = generateSessionCode();

  if (!isNeonConfigured()) {
    const store = readLocalStore();
    if (!store.customSessions) store.customSessions = [];
    while (store.customSessions.some((s) => s.code === code)) {
      code = generateSessionCode();
    }
    const created: CustomSession = {
      id: (store.nextSessionId = (store.nextSessionId || 1) + 1) - 1,
      code,
      title: input.title.trim(),
      program_id: Number(input.program_id),
      chapter_from: chFrom,
      chapter_to: chTo,
      difficulty_preset: preset,
      correct_tiles_per_round: correctTiles,
      choices_per_round: choices,
      round_time_seconds: roundTime,
      time_decay_per_round: decay,
      min_round_time_seconds: minTime,
      max_rounds: maxRounds,
      intermission_seconds: intermission,
      question_mode: qMode,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    store.customSessions.push(created);
    writeLocalStore(store);
    return (await getCustomSessionByCode(code)) || created;
  }

  await ensureNeonInitialized();
  const sql = getSql();
  for (let tries = 0; tries < 8; tries++) {
    const dup = await sql`SELECT id FROM custom_sessions WHERE code = ${code}`;
    if (dup.length === 0) break;
    code = generateSessionCode();
  }

  await sql`
    INSERT INTO custom_sessions (
      code, title, program_id, chapter_from, chapter_to,
      difficulty_preset, correct_tiles_per_round, choices_per_round,
      round_time_seconds, time_decay_per_round, min_round_time_seconds,
      max_rounds, intermission_seconds, question_mode, is_active
    )
    VALUES (
      ${code}, ${input.title.trim()}, ${Number(input.program_id)}, ${chFrom}, ${chTo},
      ${preset}, ${correctTiles}, ${choices},
      ${roundTime}, ${decay}, ${minTime},
      ${maxRounds}, ${intermission}, ${qMode}, TRUE
    )
  `;
  return (await getCustomSessionByCode(code))!;
}

export async function updateCustomSession(
  id: number,
  patch: Partial<Pick<CustomSession, "title" | "is_active" | "chapter_from" | "chapter_to">>
): Promise<CustomSession | null> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    if (!store.customSessions) return null;
    const idx = store.customSessions.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    store.customSessions[idx] = {
      ...store.customSessions[idx],
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.is_active !== undefined ? { is_active: Boolean(patch.is_active) } : {}),
      ...(patch.chapter_from !== undefined ? { chapter_from: Math.max(1, Math.floor(Number(patch.chapter_from))) } : {}),
      ...(patch.chapter_to !== undefined ? { chapter_to: Math.max(1, Math.floor(Number(patch.chapter_to))) } : {}),
    };
    writeLocalStore(store);
    return store.customSessions[idx];
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const curRows = await sql`SELECT * FROM custom_sessions WHERE id = ${id}`;
  if (curRows.length === 0) return null;
  const cur = curRows[0];

  await sql`
    UPDATE custom_sessions
    SET title = ${patch.title !== undefined ? patch.title.trim() : String(cur.title)},
        is_active = ${patch.is_active !== undefined ? Boolean(patch.is_active) : Boolean(cur.is_active)},
        chapter_from = ${patch.chapter_from !== undefined ? Math.max(1, Math.floor(Number(patch.chapter_from))) : Number(cur.chapter_from)},
        chapter_to = ${patch.chapter_to !== undefined ? Math.max(1, Math.floor(Number(patch.chapter_to))) : Number(cur.chapter_to)}
    WHERE id = ${id}
  `;
  return getCustomSessionByCode(String(cur.code));
}

export async function deleteCustomSession(id: number): Promise<boolean> {
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    if (!store.customSessions) return false;
    const before = store.customSessions.length;
    store.customSessions = store.customSessions.filter((s) => s.id !== id);
    writeLocalStore(store);
    return store.customSessions.length < before;
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const rows = await sql`DELETE FROM custom_sessions WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ==================== GAME & DIFFICULTY SETTINGS ====================
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
    show_latin_hint: Boolean(r.show_latin_hint ?? false),
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
  };
}

export async function updateGameSettings(patch: Partial<GameSettings>): Promise<GameSettings> {
  const cur = await getGameSettings();

  const choices = Math.round(clamp(Number(patch.choices_per_round ?? cur.choices_per_round), 2, 4));
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
    show_latin_hint: false,
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

// ==================== COMPETITIVE PLAYER STATS (GLOBAL + PER PROGRAM) ====================
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

export async function addProgramPlayerProgress(input: {
  programId?: number;
  programSlug?: string;
  roblox_user_id: number;
  username: string;
  display_name: string;
  rank_title: string;
  delta_rp: number;
  delta_correct: number;
  best_streak: number;
  delta_wins: number;
}): Promise<void> {
  if (EXCLUDED_DEV_USERNAMES.has(input.username.toLowerCase())) return;
  if (input.delta_rp <= 0 && input.delta_correct <= 0 && input.delta_wins <= 0) return;

  const programs = await listPrograms();
  let targetProg = input.programId ? programs.find((p) => p.id === input.programId) : undefined;
  if (!targetProg && input.programSlug) {
    targetProg = programs.find((p) => p.slug === input.programSlug);
  }
  if (!targetProg) return;

  const now = new Date().toISOString();
  if (!isNeonConfigured()) {
    const store = readLocalStore();
    if (!store.programPlayerStats) store.programPlayerStats = [];
    const idx = store.programPlayerStats.findIndex(
      (r) => r.program_id === targetProg!.id && r.roblox_user_id === input.roblox_user_id
    );
    if (idx >= 0) {
      const cur = store.programPlayerStats[idx];
      store.programPlayerStats[idx] = {
        ...cur,
        username: input.username,
        display_name: input.display_name,
        rank_title: input.rank_title,
        rank_points: cur.rank_points + Math.max(0, input.delta_rp),
        total_correct: cur.total_correct + Math.max(0, input.delta_correct),
        best_streak: Math.max(cur.best_streak, input.best_streak),
        wins: cur.wins + Math.max(0, input.delta_wins),
        updated_at: now,
      };
    } else {
      store.programPlayerStats.push({
        program_id: targetProg.id,
        roblox_user_id: input.roblox_user_id,
        username: input.username,
        display_name: input.display_name,
        rank_title: input.rank_title,
        rank_points: Math.max(0, input.delta_rp),
        total_correct: Math.max(0, input.delta_correct),
        best_streak: Math.max(0, input.best_streak),
        wins: Math.max(0, input.delta_wins),
        updated_at: now,
      });
    }
    writeLocalStore(store);
    return;
  }

  await ensureNeonInitialized();
  const sql = getSql();
  await sql`
    INSERT INTO program_player_stats (
      program_id, roblox_user_id, username, display_name,
      rank_points, rank_title, total_correct, best_streak, wins, updated_at
    )
    VALUES (
      ${targetProg.id}, ${input.roblox_user_id}, ${input.username}, ${input.display_name},
      ${Math.max(0, input.delta_rp)}, ${input.rank_title}, ${Math.max(0, input.delta_correct)},
      ${Math.max(0, input.best_streak)}, ${Math.max(0, input.delta_wins)}, NOW()
    )
    ON CONFLICT (program_id, roblox_user_id) DO UPDATE SET
      username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      rank_title = EXCLUDED.rank_title,
      rank_points = program_player_stats.rank_points + EXCLUDED.rank_points,
      total_correct = program_player_stats.total_correct + EXCLUDED.total_correct,
      best_streak = GREATEST(program_player_stats.best_streak, EXCLUDED.best_streak),
      wins = program_player_stats.wins + EXCLUDED.wins,
      updated_at = NOW()
  `;
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

export async function listProgramLeaderboards(limitPerProgram = 10): Promise<ProgramLeaderboard[]> {
  const programs = (await listPrograms()).filter((p) => p.is_active);
  if (programs.length === 0) return [];

  if (!isNeonConfigured()) {
    const store = readLocalStore();
    const allStats = store.programPlayerStats || [];
    return programs.map((prog) => {
      const entries: PlayerStat[] = allStats
        .filter((r) => r.program_id === prog.id && !EXCLUDED_DEV_USERNAMES.has(r.username.toLowerCase()))
        .sort((a, b) => b.rank_points - a.rank_points || b.wins - a.wins || b.total_correct - a.total_correct)
        .slice(0, limitPerProgram)
        .map((r) => ({
          roblox_user_id: r.roblox_user_id,
          username: r.username,
          display_name: r.display_name,
          rank_points: r.rank_points,
          rank_title: r.rank_title,
          dinar: 0,
          total_correct: r.total_correct,
          best_streak: r.best_streak,
          wins: r.wins,
          updated_at: r.updated_at,
        }));
      return {
        programId: prog.id,
        programSlug: prog.slug,
        programName: prog.name,
        color: prog.color,
        entries,
      };
    });
  }

  await ensureNeonInitialized();
  const sql = getSql();
  const result: ProgramLeaderboard[] = [];
  for (const prog of programs) {
    const rows = await sql`
      SELECT roblox_user_id, username, display_name, rank_points, rank_title,
             total_correct, best_streak, wins, updated_at
      FROM program_player_stats
      WHERE program_id = ${prog.id} AND LOWER(username) <> 'minazuki705'
      ORDER BY rank_points DESC, wins DESC, total_correct DESC
      LIMIT ${limitPerProgram}
    `;
    result.push({
      programId: prog.id,
      programSlug: prog.slug,
      programName: prog.name,
      color: prog.color,
      entries: rows.map((r) => ({
        roblox_user_id: Number(r.roblox_user_id),
        username: String(r.username),
        display_name: String(r.display_name),
        rank_points: Number(r.rank_points ?? 0),
        rank_title: String(r.rank_title ?? "Mubtadi'"),
        dinar: 0,
        total_correct: Number(r.total_correct ?? 0),
        best_streak: Number(r.best_streak ?? 0),
        wins: Number(r.wins ?? 0),
        updated_at: r.updated_at ? String(r.updated_at) : undefined,
      })),
    });
  }
  return result;
}
