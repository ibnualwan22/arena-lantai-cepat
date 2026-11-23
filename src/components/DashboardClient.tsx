"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Copy,
  Database,
  Edit3,
  FolderPlus,
  Gamepad2,
  Grid2x2,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shuffle,
  Sliders,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import {
  DIFFICULTY_PRESETS,
  type Chapter,
  type DifficultyPreset,
  type GameSettings,
  type PlayerStat,
  type QuestionMode,
  type Vocabulary,
} from "@/lib/types";

interface StatusInfo {
  storageMode: "neon" | "local";
  connected: boolean;
  chapterCount: number;
  activeChapterCount: number;
  vocabCount: number;
  activeVocabCount: number;
}

const CHAPTER_COLORS = [
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#EF4444",
  "#84CC16",
];

const OPTION_PALETTE = [
  { bg: "bg-emerald-500/20", border: "border-emerald-400", text: "text-emerald-300", label: "BENAR" },
  { bg: "bg-sky-500/15", border: "border-sky-400/70", text: "text-sky-300", label: "Pengecoh B" },
  { bg: "bg-amber-500/15", border: "border-amber-400/70", text: "text-amber-300", label: "Pengecoh C" },
  { bg: "bg-pink-500/15", border: "border-pink-400/70", text: "text-pink-300", label: "Pengecoh D" },
];

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState<"materi" | "kesulitan" | "peringkat" | "integrasi">("materi");
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [vocabs, setVocabs] = useState<Vocabulary[]>([]);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerStat[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Search & forms
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [chapterForm, setChapterForm] = useState({ name: "", description: "", color: "#10B981" });

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [editingVocab, setEditingVocab] = useState<Vocabulary | null>(null);
  const [vocabForm, setVocabForm] = useState({
    arabic: "",
    latin: "",
    meaning: "",
    sub_group: "",
    tip: "",
  });

  // Difficulty preview shuffle seed
  const [simSeed, setSimSeed] = useState(1);
  const [savingSettings, setSavingSettings] = useState(false);

  // Integration tab
  const [originUrl, setOriginUrl] = useState("http://localhost:3000");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [robloxJsonPreview, setRobloxJsonPreview] = useState<string>("");

  const notify = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast((cur) => (cur?.msg === msg ? null : cur));
    }, 3200);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [stRes, chRes, vbRes, setRes, lbRes] = await Promise.all([
        fetch("/api/status", { cache: "no-store" }),
        fetch("/api/chapters", { cache: "no-store" }),
        fetch("/api/vocabularies", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/roblox/leaderboard?limit=25", { cache: "no-store" }),
      ]);
      const [stData, chData, vbData, setData, lbData] = await Promise.all([
        stRes.json(),
        chRes.json(),
        vbRes.json(),
        setRes.json(),
        lbRes.json(),
      ]);
      setStatus(stData);
      const chList: Chapter[] = chData.chapters || [];
      setChapters(chList);
      setVocabs(vbData.vocabularies || []);
      setSettings(setData.settings || null);
      setLeaderboard(lbData.leaderboard || []);
      setSelectedChapterId((prev) =>
        prev && chList.some((c) => c.id === prev) ? prev : chList[0]?.id ?? null
      );
    } catch {
      notify("Gagal memuat data dari server.", "err");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
    loadAll();
  }, [loadAll]);

  const loadRobloxPreview = useCallback(async () => {
    try {
      const res = await fetch("/api/roblox/config", { cache: "no-store" });
      const data = await res.json();
      setRobloxJsonPreview(JSON.stringify(data, null, 2));
    } catch {
      setRobloxJsonPreview("// Gagal mengambil preview JSON");
    }
  }, []);

  useEffect(() => {
    if (activeTab === "integrasi") {
      loadRobloxPreview();
    }
  }, [activeTab, loadRobloxPreview]);

  const selectedChapter = useMemo(
    () => chapters.find((c) => c.id === selectedChapterId) ?? null,
    [chapters, selectedChapterId]
  );

  const filteredVocabs = useMemo(() => {
    return vocabs.filter((v) => {
      if (selectedChapterId && v.chapter_id !== selectedChapterId) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        v.arabic.includes(q) ||
        v.latin.toLowerCase().includes(q) ||
        v.meaning.toLowerCase().includes(q) ||
        v.sub_group.toLowerCase().includes(q)
      );
    });
  }, [vocabs, selectedChapterId, searchQuery]);

  // ==================== CHAPTER ACTIONS ====================
  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterForm.name.trim()) return;
    try {
      const url = editingChapter ? `/api/chapters/${editingChapter.id}` : "/api/chapters";
      const method = editingChapter ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chapterForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan bab");
      notify(editingChapter ? "Bab diperbarui!" : "Bab baru ditambahkan!");
      setShowNewChapter(false);
      setEditingChapter(null);
      setChapterForm({ name: "", description: "", color: "#10B981" });
      await loadAll();
      if (!editingChapter && data.chapter?.id) {
        setSelectedChapterId(data.chapter.id);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    }
  };

  const handleToggleChapter = async (chap: Chapter) => {
    try {
      const res = await fetch(`/api/chapters/${chap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !chap.is_active }),
      });
      if (!res.ok) throw new Error("Gagal mengubah status bab");
      notify(`Bab "${chap.name}" ${!chap.is_active ? "diaktifkan" : "dinonaktifkan"}.`);
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    }
  };

  const handleDeleteChapter = async (chap: Chapter) => {
    if (!confirm(`Hapus bab "${chap.name}" beserta semua mufrodat di dalamnya?`)) return;
    try {
      const res = await fetch(`/api/chapters/${chap.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus bab");
      notify(`Bab "${chap.name}" dihapus.`);
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    }
  };

  // ==================== VOCAB ACTIONS ====================
  const handleSaveVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId) return;
    if (!vocabForm.arabic.trim() || !vocabForm.latin.trim() || !vocabForm.meaning.trim()) {
      notify("Tulisan Arab, Cara Baca, dan Arti wajib diisi.", "err");
      return;
    }
    try {
      const url = editingVocab ? `/api/vocabularies/${editingVocab.id}` : "/api/vocabularies";
      const method = editingVocab ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: selectedChapterId,
          arabic: vocabForm.arabic,
          latin: vocabForm.latin,
          meaning: vocabForm.meaning,
          sub_group: vocabForm.sub_group || selectedChapter?.name || "Umum",
          tip: vocabForm.tip,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan mufrodat");
      notify(editingVocab ? "Mufrodat diperbarui!" : "Mufrodat ditambahkan!");
      setEditingVocab(null);
      setVocabForm({ arabic: "", latin: "", meaning: "", sub_group: "", tip: "" });
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    }
  };

  const handleBulkImport = async () => {
    if (!selectedChapterId || !bulkText.trim()) return;
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const items = [];
    for (const line of lines) {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 3) {
        items.push({
          chapter_id: selectedChapterId,
          arabic: parts[0],
          latin: parts[1],
          meaning: parts[2],
          tip: parts[3] || "",
          sub_group: parts[4] || selectedChapter?.name || "Umum",
        });
      }
    }
    if (items.length === 0) {
      notify("Format baris: Arab | Cara Baca | Arti | Tips (opsional)", "err");
      return;
    }
    try {
      const res = await fetch("/api/vocabularies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal import");
      notify(`Berhasil menambahkan ${items.length} mufrodat!`);
      setBulkText("");
      setShowBulkImport(false);
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    }
  };

  const handleDeleteVocab = async (v: Vocabulary) => {
    try {
      const res = await fetch(`/api/vocabularies/${v.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus mufrodat");
      notify(`"${v.meaning}" dihapus.`);
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    }
  };

  // ==================== DIFFICULTY SETTINGS ====================
  const applyPreset = (presetKey: Exclude<DifficultyPreset, "custom">) => {
    if (!settings) return;
    const p = DIFFICULTY_PRESETS[presetKey];
    setSettings({
      ...settings,
      difficulty_preset: presetKey,
      correct_tiles_per_round: p.correct_tiles_per_round,
      choices_per_round: p.choices_per_round,
      round_time_seconds: p.round_time_seconds,
      time_decay_per_round: p.time_decay_per_round,
      min_round_time_seconds: p.min_round_time_seconds,
      question_mode: p.question_mode,
      show_latin_hint: p.show_latin_hint,
    });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengaturan");
      setSettings(data.settings);
      notify("Pengaturan tingkat kesulitan disimpan! Roblox otomatis memakai aturan ini.");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    } finally {
      setSavingSettings(false);
    }
  };

  // Simulated 4x4 Arena Tile Layout reflecting exact correct_tiles_per_round & choices_per_round!
  const simulatedTiles = useMemo(() => {
    const correctCount = settings?.correct_tiles_per_round ?? 4;
    const choicesCount = settings?.choices_per_round ?? 4;
    const distractorChoices = Math.max(1, choicesCount - 1);
    const remainingTiles = Math.max(0, 16 - correctCount);

    const arr: number[] = [];
    for (let i = 0; i < correctCount; i++) arr.push(0); // 0 = Correct tile
    for (let i = 0; i < remainingTiles; i++) {
      arr.push(1 + (i % distractorChoices)); // 1..3 = Distractors
    }

    // Deterministic pseudo-random shuffle based on simSeed
    let s = simSeed * 9301 + 49297;
    for (let i = arr.length - 1; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [settings?.correct_tiles_per_round, settings?.choices_per_round, simSeed]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    notify("Disalin ke clipboard!");
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const apiEndpointUrl = `${originUrl}/api/roblox/config`;

  return (
    <div className="min-h-screen bg-[#0b1222] text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl transition-all ${
            toast.type === "ok"
              ? "border-emerald-400/40 bg-emerald-950/95 text-emerald-200"
              : "border-rose-400/40 bg-rose-950/95 text-rose-200"
          }`}
        >
          {toast.type === "ok" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0d162a]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-emerald-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                Arabic Block Rush <span className="text-amber-400">CMS</span>
              </h1>
              <p className="text-xs text-slate-400">
                Kelola Bab, Mufrodat Bahasa Arab & Tingkat Kesulitan Game Roblox
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Neon Connection Badge */}
            {status && (
              <div
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                  status.storageMode === "neon"
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-400/40 bg-amber-500/10 text-amber-300"
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                {status.storageMode === "neon"
                  ? "Terhubung ke Neon PostgreSQL"
                  : "Mode Lokal (Isi DATABASE_URL untuk Neon)"}
              </div>
            )}

            <button
              onClick={loadAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto flex max-w-7xl gap-2 px-5 pb-3">
          <button
            onClick={() => setActiveTab("materi")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "materi"
                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Layers className="h-4 w-4" />
            Bab & Mufrodat ({vocabs.length})
          </button>
          <button
            onClick={() => setActiveTab("kesulitan")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "kesulitan"
                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Tingkat Kesulitan & Kotak Arena
          </button>
          <button
            onClick={() => setActiveTab("peringkat")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "peringkat"
                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Trophy className="h-4 w-4" />
            Peringkat & Siswa ({leaderboard.length})
          </button>
          <button
            onClick={() => setActiveTab("integrasi")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "integrasi"
                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Gamepad2 className="h-4 w-4" />
            Hubungkan ke Neon & Roblox
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {/* ==================== TAB 1: BAB & MUFRODAT ==================== */}
        {activeTab === "materi" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Sidebar: Daftar Bab */}
            <section className="space-y-4 lg:col-span-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Daftar Bab Materi ({chapters.length})
                </h2>
                <button
                  onClick={() => {
                    setEditingChapter(null);
                    setChapterForm({ name: "", description: "", color: "#10B981" });
                    setShowNewChapter(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  Tambah Bab
                </button>
              </div>

              {/* Add/Edit Chapter Form */}
              {showNewChapter && (
                <form
                  onSubmit={handleSaveChapter}
                  className="space-y-3 rounded-xl border border-amber-400/40 bg-slate-900/90 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">
                      {editingChapter ? "Edit Bab" : "Buat Bab Baru"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewChapter(false);
                        setEditingChapter(null);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bab 5: Anggota Keluarga"
                    value={chapterForm.name}
                    onChange={(e) => setChapterForm({ ...chapterForm, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Deskripsi singkat bab..."
                    value={chapterForm.description}
                    onChange={(e) =>
                      setChapterForm({ ...chapterForm, description: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Warna:</span>
                    {CHAPTER_COLORS.map((hex) => (
                      <button
                        type="button"
                        key={hex}
                        onClick={() => setChapterForm({ ...chapterForm, color: hex })}
                        className={`h-6 w-6 rounded-full border-2 transition ${
                          chapterForm.color === hex ? "scale-110 border-white" : "border-transparent"
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-400 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Simpan Bab
                  </button>
                </form>
              )}

              {/* Chapter Cards */}
              <div className="space-y-2.5">
                {chapters.map((chap) => {
                  const active = chap.id === selectedChapterId;
                  return (
                    <div
                      key={chap.id}
                      onClick={() => setSelectedChapterId(chap.id)}
                      className={`cursor-pointer rounded-xl border p-3.5 transition ${
                        active
                          ? "border-amber-400/70 bg-slate-800/90 shadow-lg shadow-amber-500/10"
                          : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full"
                            style={{ backgroundColor: chap.color }}
                          />
                          <div>
                            <h3 className="text-sm font-bold text-white">{chap.name}</h3>
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                              {chap.description || "Tidak ada deskripsi"}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-md bg-slate-950 px-2 py-0.5 text-xs font-bold text-amber-300">
                          {chap.vocab_count ?? 0} kata
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleChapter(chap);
                          }}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            chap.is_active
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {chap.is_active ? "Aktif di Game" : "Nonaktif"}
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChapter(chap);
                              setChapterForm({
                                name: chap.name,
                                description: chap.description,
                                color: chap.color,
                              });
                              setShowNewChapter(true);
                            }}
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                            title="Edit Bab"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChapter(chap);
                            }}
                            className="rounded-md p-1 text-slate-400 hover:bg-rose-950 hover:text-rose-300"
                            title="Hapus Bab"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Right Main Panel: Mufrodat List & Forms */}
            <section className="space-y-4 lg:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div>
                  <h2 className="text-base font-bold text-white">
                    {selectedChapter ? selectedChapter.name : "Pilih Bab di sebelah kiri"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedChapter?.description || "Tambah atau edit isi mufrodat untuk bab ini."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBulkImport((s) => !s)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Import Cepat
                  </button>
                </div>
              </div>

              {/* Bulk Import Box */}
              {showBulkImport && selectedChapter && (
                <div className="space-y-3 rounded-xl border border-sky-500/40 bg-slate-900/90 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300">
                      Import Banyak Mufrodat Sekaligus (1 baris = 1 kata)
                    </span>
                    <button onClick={() => setShowBulkImport(false)}>
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Format: <code className="text-amber-300">Arab | Cara Baca | Arti | Tips (opsional)</code>
                  </p>
                  <textarea
                    rows={4}
                    placeholder={"أَبٌ | Abun | Ayah | Kepala keluarga\nأُمٌّ | Ummun | Ibu | Orang tua perempuan"}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-sky-400 focus:outline-none"
                  />
                  <button
                    onClick={handleBulkImport}
                    className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400"
                  >
                    Tambahkan Semua Baris
                  </button>
                </div>
              )}

              {/* Add / Edit Single Mufrodat Form */}
              {selectedChapter && (
                <form
                  onSubmit={handleSaveVocab}
                  className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {editingVocab ? `Edit Mufrodat #${editingVocab.id}` : "+ Tambah Mufrodat Baru"}
                    </span>
                    {editingVocab && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingVocab(null);
                          setVocabForm({ arabic: "", latin: "", meaning: "", sub_group: "", tip: "" });
                        }}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Batal Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-400">
                        Tulisan Arab (berharakat) *
                      </label>
                      <input
                        type="text"
                        required
                        dir="rtl"
                        placeholder="مثال: كِتَابٌ"
                        value={vocabForm.arabic}
                        onChange={(e) => setVocabForm({ ...vocabForm, arabic: e.target.value })}
                        className="font-arabic w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-lg text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-400">
                        Cara Baca (Latin) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Kitābun"
                        value={vocabForm.latin}
                        onChange={(e) => setVocabForm({ ...vocabForm, latin: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-400">
                        Arti Bahasa Indonesia *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Buku"
                        value={vocabForm.meaning}
                        onChange={(e) => setVocabForm({ ...vocabForm, meaning: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        placeholder="Sub-kelompok (mis: Benda, Angka, Warna)"
                        value={vocabForm.sub_group}
                        onChange={(e) => setVocabForm({ ...vocabForm, sub_group: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        placeholder="Tips / petunjuk ingatan (opsional)"
                        value={vocabForm.tip}
                        onChange={(e) => setVocabForm({ ...vocabForm, tip: e.target.value })}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <button
                        type="submit"
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-400 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
                      >
                        <Plus className="h-4 w-4" />
                        {editingVocab ? "Update" : "Tambah"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari mufrodat (Arab, latin, atau arti)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/70 py-2 pl-10 pr-4 text-sm text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Vocab Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredVocabs.map((v) => (
                  <div
                    key={v.id}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 transition hover:border-slate-700"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-arabic text-2xl font-bold text-white">{v.arabic}</span>
                        <span className="text-xs font-bold text-amber-300">{v.latin}</span>
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-emerald-300">{v.meaning}</p>
                      {v.tip && <p className="mt-0.5 truncate text-xs text-slate-400">{v.tip}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        onClick={() => {
                          setEditingVocab(v);
                          setVocabForm({
                            arabic: v.arabic,
                            latin: v.latin,
                            meaning: v.meaning,
                            sub_group: v.sub_group,
                            tip: v.tip,
                          });
                        }}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVocab(v)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-950 hover:text-rose-300"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredVocabs.length === 0 && (
                  <div className="col-span-full rounded-xl border border-dashed border-slate-800 py-10 text-center text-sm text-slate-500">
                    Belum ada mufrodat di bab ini. Tambahkan lewat form di atas!
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ==================== TAB 2: TINGKAT KESULITAN & KOTAK ARENA ==================== */}
        {activeTab === "kesulitan" && settings && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Controls Column */}
            <section className="space-y-5 lg:col-span-7">
              {/* Presets */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                    Preset Tingkat Kesulitan Cepat
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(["mudah", "sedang", "sulit"] as const).map((key) => {
                    const p = DIFFICULTY_PRESETS[key];
                    const selected = settings.difficulty_preset === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyPreset(key)}
                        className={`rounded-xl border p-3.5 text-left transition ${
                          selected
                            ? "border-amber-400 bg-amber-400/15 shadow-md"
                            : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                        }`}
                      >
                        <div className="text-sm font-bold text-white">{p.label}</div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          {p.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Sliders */}
              <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Pengaturan Detail Arena & Ronde
                </h2>

                {/* Correct Tiles per Round */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-semibold text-white">
                      Jumlah Kotak Jawaban BENAR per Ronde
                    </label>
                    <span className="rounded-lg bg-emerald-500/20 px-2.5 py-0.5 text-sm font-bold text-emerald-300">
                      {settings.correct_tiles_per_round} dari 16 kotak
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={Math.min(12, 16 - (settings.choices_per_round - 1))}
                    value={settings.correct_tiles_per_round}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        difficulty_preset: "custom",
                        correct_tiles_per_round: Number(e.target.value),
                      })
                    }
                    className="w-full accent-emerald-400"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Semakin sedikit kotak benar (misal 1–2 kotak), semakin menantang karena pemain
                    harus cepat berebut menemukan ubin yang tepat!
                  </p>
                </div>

                {/* Choices per Round */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-semibold text-white">
                      Jumlah Pilihan Jawaban Unik per Ronde
                    </label>
                    <span className="rounded-lg bg-sky-500/20 px-2.5 py-0.5 text-sm font-bold text-sky-300">
                      {settings.choices_per_round} Pilihan
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          const maxCorrect = Math.min(12, 16 - (n - 1));
                          setSettings({
                            ...settings,
                            difficulty_preset: "custom",
                            choices_per_round: n,
                            correct_tiles_per_round: Math.min(
                              settings.correct_tiles_per_round,
                              maxCorrect
                            ),
                          });
                        }}
                        className={`rounded-lg border py-2 text-xs font-bold transition ${
                          settings.choices_per_round === n
                            ? "border-sky-400 bg-sky-500/20 text-sky-200"
                            : "border-slate-700 bg-slate-950 text-slate-400 hover:text-white"
                        }`}
                      >
                        {n} Pilihan ({n - 1} pengecoh)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timer & Rounds Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">Waktu Awal per Ronde</span>
                      <span className="text-amber-300">{settings.round_time_seconds} detik</span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={20}
                      step={0.5}
                      value={settings.round_time_seconds}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          difficulty_preset: "custom",
                          round_time_seconds: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">Pengurangan Waktu / Ronde</span>
                      <span className="text-amber-300">-{settings.time_decay_per_round} dtk</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.2}
                      step={0.1}
                      value={settings.time_decay_per_round}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          difficulty_preset: "custom",
                          time_decay_per_round: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">Jumlah Ronde per Match</span>
                      <span className="text-amber-300">{settings.max_rounds} ronde</span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={20}
                      value={settings.max_rounds}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          max_rounds: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">Waktu Persiapan (Lobby)</span>
                      <span className="text-amber-300">{settings.intermission_seconds} detik</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={25}
                      value={settings.intermission_seconds}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          intermission_seconds: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>

                {/* Question Mode & Latin Hint */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                      Mode Arah Soal
                    </label>
                    <select
                      value={settings.question_mode}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          difficulty_preset: "custom",
                          question_mode: e.target.value as QuestionMode,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                    >
                      <option value="auto">Otomatis Progresif (Mudah → Sedang → Tantangan)</option>
                      <option value="id_to_ar_hint">Soal Indonesia → Ubin Bahasa Arab</option>
                      <option value="ar_to_id">Soal Bahasa Arab → Ubin Arti Indonesia</option>
                      <option value="id_to_ar_hard">Tantangan: Soal Indonesia → Arab (Tanpa Latin)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <label className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2">
                      <span className="text-xs font-semibold text-slate-200">
                        Tampilkan Cara Baca (Latin) di Ubin
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.show_latin_hint}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            difficulty_preset: "custom",
                            show_latin_hint: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-emerald-400"
                      />
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 py-3 text-sm font-bold text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingSettings ? "Menyimpan..." : "Simpan Pengaturan Kesulitan"}
                </button>
              </div>
            </section>

            {/* Right Column: Live 4x4 Roblox Arena Preview */}
            <section className="lg:col-span-5">
              <div className="sticky top-32 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid2x2 className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Simulasi Lantai Arena 4×4</h3>
                  </div>
                  <button
                    onClick={() => setSimSeed((s) => s + 1)}
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Acak Posisi
                  </button>
                </div>

                <div className="mb-3 rounded-xl border border-amber-400/30 bg-slate-950 px-3 py-2 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Contoh Soal Ronde 1 • Waktu {settings.round_time_seconds} dtk
                  </div>
                  <div className="text-sm font-bold text-white">
                    Cari Bahasa Arab dari: &ldquo;Buku&rdquo;
                  </div>
                </div>

                {/* 4x4 Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {simulatedTiles.map((optIdx, idx) => {
                    const style = OPTION_PALETTE[optIdx] || OPTION_PALETTE[1];
                    const sampleArabic = ["كِتَابٌ", "قَلَمٌ", "مَكْتَبٌ", "بَابٌ"][optIdx] || "قَلَمٌ";
                    const sampleLatin = ["Kitābun", "Qalamun", "Maktabun", "Bābun"][optIdx] || "Qalamun";
                    return (
                      <div
                        key={idx}
                        className={`flex aspect-square flex-col items-center justify-center rounded-xl border-2 p-1.5 text-center transition-all ${style.bg} ${style.border}`}
                      >
                        <span className={`text-[9px] font-bold uppercase ${style.text}`}>
                          {optIdx === 0 ? "BENAR" : "SALAH"}
                        </span>
                        <span className="font-arabic text-lg font-bold text-white sm:text-xl">
                          {sampleArabic}
                        </span>
                        {settings.show_latin_hint && settings.question_mode !== "id_to_ar_hard" && (
                          <span className="text-[10px] text-slate-300">{sampleLatin}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950/70 px-3.5 py-2.5 text-xs text-slate-300">
                  <span>
                    Kotak Aman:{" "}
                    <strong className="text-emerald-400">{settings.correct_tiles_per_round}</strong>
                  </span>
                  <span>
                    Kotak Jatuh:{" "}
                    <strong className="text-rose-400">
                      {16 - settings.correct_tiles_per_round}
                    </strong>
                  </span>
                  <span>
                    Peluang Acak:{" "}
                    <strong className="text-amber-300">
                      {Math.round((settings.correct_tiles_per_round / 16) * 100)}%
                    </strong>
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ==================== TAB 3: PERINGKAT & SISWA ==================== */}
        {activeTab === "peringkat" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-white">
                  <Trophy className="h-5 w-5 text-amber-400" />
                  Papan Peringkat Global & Perkembangan Siswa
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Data otomatis tersinkronisasi dari game Roblox setelah pemain menyelesaikan ronde / pertandingan.
                </p>
              </div>
              <button
                onClick={loadAll}
                className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Segarkan Peringkat
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Pemain</th>
                      <th className="px-4 py-3">Pangkat (Rank)</th>
                      <th className="px-4 py-3 text-right">Poin Rank (RP)</th>
                      <th className="px-4 py-3 text-right">Jawaban Benar</th>
                      <th className="px-4 py-3 text-right">Streak Terbaik</th>
                      <th className="px-4 py-3 text-right">Juara (Win)</th>
                      <th className="px-4 py-3 text-right">Koin Dinar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {leaderboard.map((p, idx) => (
                      <tr key={p.roblox_user_id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-amber-300">
                          {idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{p.display_name}</div>
                          <div className="text-xs text-slate-400">@{p.username}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                            {p.rank_title}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-300">
                          {p.rank_points} RP
                        </td>
                        <td className="px-4 py-3 text-right text-slate-200">{p.total_correct}</td>
                        <td className="px-4 py-3 text-right text-sky-300">x{p.best_streak}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                          {p.wins}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-200">
                          {p.dinar}
                        </td>
                      </tr>
                    ))}
                    {leaderboard.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                          Belum ada data peringkat. Mainkan minimal 1 ronde di Roblox agar skor otomatis tercatat di sini!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ==================== TAB 4: INTEGRASI NEON & ROBLOX ==================== */}
        {activeTab === "integrasi" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="space-y-5 lg:col-span-6">
              {/* Neon Setup Card */}
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Database className="h-5 w-5" />
                  <h2 className="text-base font-bold text-white">1. Hubungkan Database ke Neon</h2>
                </div>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
                  <li>
                    Buka <strong>console.neon.tech</strong>, buat project PostgreSQL baru, lalu salin{" "}
                    <code className="rounded bg-slate-950 px-1.5 py-0.5 text-amber-300">
                      Connection String
                    </code>
                    .
                  </li>
                  <li>
                    Salin file <code className="text-amber-300">.env.example</code> menjadi{" "}
                    <code className="text-amber-300">.env.local</code> lalu isi:
                  </li>
                </ol>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-emerald-300">
                  <span className="truncate">
                    DATABASE_URL=&quot;postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require&quot;
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Restart web app (<code className="text-slate-200">npm run dev</code>). Tabel{" "}
                  <code className="text-slate-200">chapters</code>,{" "}
                  <code className="text-slate-200">vocabularies</code>, dan{" "}
                  <code className="text-slate-200">game_settings</code> akan{" "}
                  <strong>otomatis dibuat & diisi data awal</strong> saat pertama kali dibuka!
                </p>
              </div>

              {/* Roblox Setup Card */}
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center gap-2 text-amber-400">
                  <Gamepad2 className="h-5 w-5" />
                  <h2 className="text-base font-bold text-white">
                    2. Hubungkan ke Game Roblox Studio
                  </h2>
                </div>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
                  <li>
                    Di Roblox Studio, aktifkan{" "}
                    <strong>Game Settings → Security → Allow HTTP Requests (ON)</strong>.
                  </li>
                  <li>
                    Deploy web ini (misal ke <strong>Vercel</strong> gratis) agar mendapat URL HTTPS
                    publik, atau gunakan URL lokal di bawah saat testing di Studio.
                  </li>
                  <li>
                    Di Explorer Roblox Studio, klik{" "}
                    <code className="rounded bg-slate-950 px-1.5 py-0.5 text-amber-300">
                      ReplicatedStorage.WebConfig
                    </code>{" "}
                    lalu tempel URL API berikut ke atribut{" "}
                    <code className="text-emerald-300">ApiUrl</code>:
                  </li>
                </ol>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-slate-950 p-3">
                  <code className="truncate text-xs text-amber-300">{apiEndpointUrl}</code>
                  <button
                    onClick={() => copyText(apiEndpointUrl, "api")}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300"
                  >
                    {copiedKey === "api" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Salin URL
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Setiap kali match baru dimulai di Roblox, server otomatis menarik Bab, Mufrodat,
                  dan Pengaturan Jumlah Kotak Benar terbaru dari URL ini!
                </p>
              </div>
            </section>

            {/* Live JSON Preview */}
            <section className="lg:col-span-6">
              <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    Live Preview Output JSON untuk Roblox
                  </h3>
                  <button
                    onClick={loadRobloxPreview}
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Muat Ulang
                  </button>
                </div>
                <pre className="max-h-[460px] flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-300">
                  {robloxJsonPreview || "Memuat JSON..."}
                </pre>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
