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
  KeyRound,
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
  Users,
  X,
} from "lucide-react";
import {
  DIFFICULTY_PRESETS,
  type Chapter,
  type CustomSession,
  type DifficultyPreset,
  type GameSettings,
  type PlayerStat,
  type Program,
  type ProgramLeaderboard,
  type QuestionMode,
  type Vocabulary,
} from "@/lib/types";

interface StatusInfo {
  storageMode: "neon" | "local";
  connected: boolean;
  programCount: number;
  activeProgramCount: number;
  chapterCount: number;
  activeChapterCount: number;
  vocabCount: number;
  activeVocabCount: number;
  sessionCount: number;
}

const COLORS = [
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
  { bg: "bg-emerald-500/20", border: "border-emerald-400", text: "text-emerald-300" },
  { bg: "bg-sky-500/15", border: "border-sky-400/70", text: "text-sky-300" },
  { bg: "bg-amber-500/15", border: "border-amber-400/70", text: "text-amber-300" },
  { bg: "bg-pink-500/15", border: "border-pink-400/70", text: "text-pink-300" },
];

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState<
    "materi" | "sesi" | "kesulitan" | "peringkat" | "integrasi"
  >("materi");

  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [vocabs, setVocabs] = useState<Vocabulary[]>([]);
  const [sessions, setSessions] = useState<CustomSession[]>([]);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerStat[]>([]);
  const [programLeaderboards, setProgramLeaderboards] = useState<ProgramLeaderboard[]>([]);

  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [selectedLbFilter, setSelectedLbFilter] = useState<"global" | number>("global");

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Program Form
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [programForm, setProgramForm] = useState({ name: "", description: "", color: "#10B981" });

  // Chapter Form
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [chapterForm, setChapterForm] = useState({
    chapter_number: 1,
    name: "",
    description: "",
    color: "#3B82F6",
  });

  // Vocab Form (Arab + Arti ONLY!)
  const [searchQuery, setSearchQuery] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [editingVocab, setEditingVocab] = useState<Vocabulary | null>(null);
  const [vocabForm, setVocabForm] = useState({ arabic: "", meaning: "", tip: "" });

  // Custom Session Form
  const [sessionForm, setSessionForm] = useState({
    title: "",
    program_id: 0,
    chapter_from: 1,
    chapter_to: 1,
    difficulty_preset: "sedang" as DifficultyPreset,
    correct_tiles_per_round: 4,
    choices_per_round: 4,
    round_time_seconds: 8.0,
    time_decay_per_round: 0.3,
    min_round_time_seconds: 5.0,
    max_rounds: 10,
    intermission_seconds: 8,
    question_mode: "auto" as QuestionMode,
  });
  const [creatingSession, setCreatingSession] = useState(false);

  // Difficulty preview
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
    }, 3400);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [stRes, prRes, chRes, vbRes, sesRes, setRes, lbRes] = await Promise.all([
        fetch("/api/status", { cache: "no-store" }),
        fetch("/api/programs", { cache: "no-store" }),
        fetch("/api/chapters", { cache: "no-store" }),
        fetch("/api/vocabularies", { cache: "no-store" }),
        fetch("/api/sessions", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/roblox/leaderboard?limit=25", { cache: "no-store" }),
      ]);
      const [stData, prData, chData, vbData, sesData, setData, lbData] = await Promise.all([
        stRes.json(),
        prRes.json(),
        chRes.json(),
        vbRes.json(),
        sesRes.json(),
        setRes.json(),
        lbRes.json(),
      ]);

      setStatus(stData);
      const prList: Program[] = prData.programs || [];
      const chList: Chapter[] = chData.chapters || [];
      setPrograms(prList);
      setChapters(chList);
      setVocabs(vbData.vocabularies || []);
      setSessions(sesData.sessions || []);
      setSettings(setData.settings || null);
      setLeaderboard(lbData.leaderboard || []);
      setProgramLeaderboards(lbData.programLeaderboards || []);

      setSelectedProgramId((prev) =>
        prev && prList.some((p) => p.id === prev) ? prev : prList[0]?.id ?? null
      );
      setSessionForm((prev) => {
        const pid = prev.program_id && prList.some((p) => p.id === prev.program_id)
          ? prev.program_id
          : prList[0]?.id ?? 0;
        const pChaps = chList.filter((c) => c.program_id === pid);
        const minC = pChaps.length > 0 ? Math.min(...pChaps.map((c) => c.chapter_number)) : 1;
        const maxC = pChaps.length > 0 ? Math.max(...pChaps.map((c) => c.chapter_number)) : 1;
        return prev.program_id === pid
          ? prev
          : { ...prev, program_id: pid, chapter_from: minC, chapter_to: maxC };
      });
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

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === selectedProgramId) ?? null,
    [programs, selectedProgramId]
  );

  const programChapters = useMemo(
    () =>
      chapters
        .filter((c) => c.program_id === selectedProgramId)
        .sort((a, b) => a.chapter_number - b.chapter_number || a.id - b.id),
    [chapters, selectedProgramId]
  );

  useEffect(() => {
    if (programChapters.length === 0) {
      setSelectedChapterId(null);
    } else if (!selectedChapterId || !programChapters.some((c) => c.id === selectedChapterId)) {
      setSelectedChapterId(programChapters[0].id);
    }
  }, [programChapters, selectedChapterId]);

  const selectedChapter = useMemo(
    () => programChapters.find((c) => c.id === selectedChapterId) ?? null,
    [programChapters, selectedChapterId]
  );

  const filteredVocabs = useMemo(() => {
    return vocabs.filter((v) => {
      if (selectedChapterId && v.chapter_id !== selectedChapterId) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return v.arabic.includes(q) || v.meaning.toLowerCase().includes(q) || v.tip.toLowerCase().includes(q);
    });
  }, [vocabs, selectedChapterId, searchQuery]);

  // Chapters & live vocab count preview for Custom Session form
  const sessionProgramChapters = useMemo(
    () =>
      chapters
        .filter((c) => c.program_id === sessionForm.program_id && c.is_active)
        .sort((a, b) => a.chapter_number - b.chapter_number),
    [chapters, sessionForm.program_id]
  );

  const sessionMatchingVocabCount = useMemo(() => {
    const matchedChapIds = new Set(
      sessionProgramChapters
        .filter((c) => c.chapter_number >= sessionForm.chapter_from && c.chapter_number <= sessionForm.chapter_to)
        .map((c) => c.id)
    );
    return vocabs.filter((v) => v.is_active && matchedChapIds.has(v.chapter_id)).length;
  }, [sessionProgramChapters, sessionForm.chapter_from, sessionForm.chapter_to, vocabs]);

  // ==================== PROGRAM ACTIONS ====================
  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programForm.name.trim()) return;
    try {
      const url = editingProgram ? `/api/programs/${editingProgram.id}` : "/api/programs";
      const method = editingProgram ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(programForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan program");
      notify(editingProgram ? "Program diperbarui!" : "Program baru dibuat!");
      setShowProgramForm(false);
      setEditingProgram(null);
      setProgramForm({ name: "", description: "", color: "#10B981" });
      await loadAll();
      if (!editingProgram && data.program?.id) {
        setSelectedProgramId(data.program.id);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    }
  };

  const handleToggleProgram = async (prog: Program) => {
    try {
      const res = await fetch(`/api/programs/${prog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !prog.is_active }),
      });
      if (!res.ok) throw new Error("Gagal ubah status program");
      notify(`Program "${prog.name}" ${!prog.is_active ? "diaktifkan" : "dinonaktifkan"}.`);
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    }
  };

  const handleDeleteProgram = async (prog: Program) => {
    if (!confirm(`Hapus program "${prog.name}" beserta seluruh bab & mufrodat di dalamnya?`)) return;
    try {
      const res = await fetch(`/api/programs/${prog.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus program");
      notify(`Program "${prog.name}" dihapus.`);
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    }
  };

  // ==================== CHAPTER ACTIONS ====================
  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramId || !chapterForm.name.trim()) return;
    try {
      const url = editingChapter ? `/api/chapters/${editingChapter.id}` : "/api/chapters";
      const method = editingChapter ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...chapterForm,
          program_id: selectedProgramId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan bab");
      notify(editingChapter ? "Bab diperbarui!" : "Bab baru ditambahkan!");
      setShowNewChapter(false);
      setEditingChapter(null);
      setChapterForm({ chapter_number: programChapters.length + 2, name: "", description: "", color: "#3B82F6" });
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
      notify(`Bab ${chap.chapter_number} ${!chap.is_active ? "diaktifkan" : "dinonaktifkan"}.`);
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    }
  };

  const handleDeleteChapter = async (chap: Chapter) => {
    if (!confirm(`Hapus "${chap.name}" beserta semua mufrodat di dalamnya?`)) return;
    try {
      const res = await fetch(`/api/chapters/${chap.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus bab");
      notify(`"${chap.name}" dihapus.`);
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    }
  };

  // ==================== VOCAB ACTIONS (Arab + Arti ONLY!) ====================
  const handleSaveVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId) return;
    if (!vocabForm.arabic.trim() || !vocabForm.meaning.trim()) {
      notify("Tulisan Arab dan Arti wajib diisi.", "err");
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
          latin: "",
          meaning: vocabForm.meaning,
          sub_group: selectedChapter?.name || "Umum",
          tip: vocabForm.tip,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan mufrodat");
      notify(editingVocab ? "Mufrodat diperbarui!" : "Mufrodat ditambahkan!");
      setEditingVocab(null);
      setVocabForm({ arabic: "", meaning: "", tip: "" });
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
      // Support both "Arab | Arti" (new primary format) and "Arab | Latin | Arti" (legacy paste)
      const parts = line.split(/[|\t=]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length === 2) {
        items.push({
          chapter_id: selectedChapterId,
          arabic: parts[0],
          latin: "",
          meaning: parts[1],
          tip: "",
          sub_group: selectedChapter?.name || "Umum",
        });
      } else if (parts.length >= 3) {
        items.push({
          chapter_id: selectedChapterId,
          arabic: parts[0],
          latin: "",
          meaning: parts[1],
          tip: parts[2] || "",
          sub_group: selectedChapter?.name || "Umum",
        });
      }
    }
    if (items.length === 0) {
      notify("Format baris: Arab | Arti (contoh: كِتَابٌ | Buku)", "err");
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

  // ==================== CUSTOM SESSION ACTIONS ====================
  const applySessionPreset = (key: Exclude<DifficultyPreset, "custom">) => {
    const p = DIFFICULTY_PRESETS[key];
    setSessionForm((prev) => ({
      ...prev,
      difficulty_preset: key,
      correct_tiles_per_round: p.correct_tiles_per_round,
      choices_per_round: p.choices_per_round,
      round_time_seconds: p.round_time_seconds,
      time_decay_per_round: p.time_decay_per_round,
      min_round_time_seconds: p.min_round_time_seconds,
      question_mode: p.question_mode,
    }));
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.title.trim() || !sessionForm.program_id) {
      notify("Nama sesi dan program wajib diisi.", "err");
      return;
    }
    if (sessionMatchingVocabCount < 2) {
      notify("Rentang bab ini memiliki kurang dari 2 mufrodat aktif. Perluas bab atau tambah mufrodat dulu.", "err");
      return;
    }
    setCreatingSession(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat sesi");
      notify(`Sesi dibuat! Kode Sesi: ${data.session.code}`);
      setSessionForm((prev) => ({ ...prev, title: "" }));
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    } finally {
      setCreatingSession(false);
    }
  };

  const handleToggleSession = async (ses: CustomSession) => {
    try {
      const res = await fetch(`/api/sessions/${ses.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !ses.is_active }),
      });
      if (!res.ok) throw new Error("Gagal ubah status sesi");
      notify(`Sesi ${ses.code} ${!ses.is_active ? "diaktifkan" : "ditutup"}.`);
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    }
  };

  const handleDeleteSession = async (ses: CustomSession) => {
    if (!confirm(`Hapus sesi "${ses.title}" (Kode: ${ses.code})?`)) return;
    try {
      const res = await fetch(`/api/sessions/${ses.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus sesi");
      notify(`Sesi ${ses.code} dihapus.`);
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
      show_latin_hint: false,
    });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, show_latin_hint: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengaturan");
      setSettings(data.settings);
      notify("Pengaturan Mode Umum disimpan!");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Error", "err");
    } finally {
      setSavingSettings(false);
    }
  };

  const simulatedTiles = useMemo(() => {
    const correctCount = settings?.correct_tiles_per_round ?? 4;
    const choicesCount = settings?.choices_per_round ?? 4;
    const distractorChoices = Math.max(1, choicesCount - 1);
    const remainingTiles = Math.max(0, 16 - correctCount);
    const arr: number[] = [];
    for (let i = 0; i < correctCount; i++) arr.push(0);
    for (let i = 0; i < remainingTiles; i++) arr.push(1 + (i % distractorChoices));
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

  const displayedLeaderboard = useMemo(() => {
    if (selectedLbFilter === "global") return leaderboard;
    const found = programLeaderboards.find((pl) => pl.programId === selectedLbFilter);
    return found ? found.entries : [];
  }, [selectedLbFilter, leaderboard, programLeaderboards]);

  const apiEndpointUrl = `${originUrl}/api/roblox/config`;

  return (
    <div className="min-h-screen bg-[#0b1222] text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl ${
            toast.type === "ok"
              ? "border-emerald-400/40 bg-emerald-950/95 text-emerald-200"
              : "border-rose-400/40 bg-rose-950/95 text-rose-200"
          }`}
        >
          {toast.type === "ok" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0d162a]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-emerald-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                Mufrodat Blok <span className="text-amber-400">CMS</span>
              </h1>
              <p className="text-xs text-slate-400">
                Program → Bab → Mufrodat (Arab & Arti) • Sesi Kelas Kustom • Peringkat Global & Program
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {status && (
              <div
                className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                  status.storageMode === "neon"
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-400/40 bg-amber-500/10 text-amber-300"
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                {status.storageMode === "neon" ? "Neon PostgreSQL Aktif" : "Mode Lokal"}
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
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-5 pb-3">
          {[
            { id: "materi", icon: Layers, label: `Program, Bab & Mufrodat (${vocabs.length})` },
            { id: "sesi", icon: KeyRound, label: `Sesi Kustom Kelas (${sessions.filter((s) => s.is_active).length})` },
            { id: "kesulitan", icon: Sliders, label: "Mode Umum & Arena" },
            { id: "peringkat", icon: Trophy, label: `Peringkat (${leaderboard.length})` },
            { id: "integrasi", icon: Gamepad2, label: "Integrasi Roblox" },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                  active
                    ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {/* ==================== TAB 1: PROGRAM -> BAB -> MUFRODAT ==================== */}
        {activeTab === "materi" && (
          <div className="space-y-6">
            {/* TOP: PROGRAMS SELECTOR & CRUD */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                    1. Pilih atau Buat Program ({programs.length})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Mode Umum di Roblox membuka semua Program aktif beserta seluruh bab di dalamnya.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingProgram(null);
                    setProgramForm({ name: "", description: "", color: "#10B981" });
                    setShowProgramForm(true);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Program
                </button>
              </div>

              {showProgramForm && (
                <form
                  onSubmit={handleSaveProgram}
                  className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-amber-400/40 bg-slate-950/90 p-4 sm:grid-cols-12"
                >
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      required
                      placeholder="Nama Program (mis: Baina Yadaik 1 / Kelas 7)"
                      value={programForm.name}
                      onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Deskripsi singkat program..."
                      value={programForm.description}
                      onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 sm:col-span-2">
                    {COLORS.slice(0, 6).map((hex) => (
                      <button
                        type="button"
                        key={hex}
                        onClick={() => setProgramForm({ ...programForm, color: hex })}
                        className={`h-6 w-6 rounded-full border-2 ${
                          programForm.color === hex ? "scale-110 border-white" : "border-transparent"
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                    >
                      {editingProgram ? "Update" : "Simpan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProgramForm(false)}
                      className="rounded-lg border border-slate-700 px-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {programs.map((prog) => {
                  const active = prog.id === selectedProgramId;
                  return (
                    <div
                      key={prog.id}
                      onClick={() => setSelectedProgramId(prog.id)}
                      className={`cursor-pointer rounded-xl border p-3.5 transition ${
                        active
                          ? "border-amber-400 bg-slate-800/90 shadow-lg shadow-amber-500/10"
                          : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: prog.color }} />
                          <h3 className="text-sm font-bold text-white">{prog.name}</h3>
                        </div>
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">
                          {prog.chapter_count ?? 0} bab
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                        {prog.vocab_count ?? 0} mufrodat • {prog.description || "Tanpa deskripsi"}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800 pt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleProgram(prog);
                          }}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            prog.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {prog.is_active ? "Aktif" : "Nonaktif"}
                        </button>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProgram(prog);
                              setProgramForm({ name: prog.name, description: prog.description, color: prog.color });
                              setShowProgramForm(true);
                            }}
                            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          {programs.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProgram(prog);
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-rose-950 hover:text-rose-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* BOTTOM GRID: BAB (LEFT) + MUFRODAT (RIGHT) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Chapters Sidebar */}
              <section className="space-y-4 lg:col-span-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    2. Daftar Bab ({programChapters.length})
                  </h2>
                  <button
                    disabled={!selectedProgramId}
                    onClick={() => {
                      const nextNum =
                        programChapters.length > 0
                          ? Math.max(...programChapters.map((c) => c.chapter_number)) + 1
                          : 1;
                      setEditingChapter(null);
                      setChapterForm({
                        chapter_number: nextNum,
                        name: `Bab ${nextNum}: `,
                        description: "",
                        color: COLORS[nextNum % COLORS.length],
                      });
                      setShowNewChapter(true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    Tambah Bab
                  </button>
                </div>

                {showNewChapter && (
                  <form
                    onSubmit={handleSaveChapter}
                    className="space-y-3 rounded-xl border border-emerald-400/40 bg-slate-900/90 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300">
                        {editingChapter ? "Edit Bab" : `Tambah Bab di ${selectedProgram?.name}`}
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
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-400">Nomor Bab</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={chapterForm.chapter_number}
                          onChange={(e) =>
                            setChapterForm({ ...chapterForm, chapter_number: Number(e.target.value) })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-[10px] text-slate-400">Nama Bab</label>
                        <input
                          type="text"
                          required
                          placeholder="Bab 1: Perkenalan"
                          value={chapterForm.name}
                          onChange={(e) => setChapterForm({ ...chapterForm, name: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Deskripsi singkat bab (opsional)"
                      value={chapterForm.description}
                      onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Warna:</span>
                      {COLORS.map((hex) => (
                        <button
                          type="button"
                          key={hex}
                          onClick={() => setChapterForm({ ...chapterForm, color: hex })}
                          className={`h-5 w-5 rounded-full border-2 ${
                            chapterForm.color === hex ? "scale-110 border-white" : "border-transparent"
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-400 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-300"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Simpan Bab
                    </button>
                  </form>
                )}

                <div className="space-y-2.5">
                  {programChapters.map((chap) => {
                    const active = chap.id === selectedChapterId;
                    return (
                      <div
                        key={chap.id}
                        onClick={() => setSelectedChapterId(chap.id)}
                        className={`cursor-pointer rounded-xl border p-3.5 transition ${
                          active
                            ? "border-amber-400/70 bg-slate-800/90 shadow-lg"
                            : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black text-slate-950"
                              style={{ backgroundColor: chap.color }}
                            >
                              {chap.chapter_number}
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-white">{chap.name}</h3>
                              <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                                {chap.description || `Bab ke-${chap.chapter_number}`}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-md bg-slate-950 px-2 py-0.5 text-xs font-bold text-amber-300">
                            {chap.vocab_count ?? 0} kata
                          </span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleChapter(chap);
                            }}
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              chap.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            {chap.is_active ? "Aktif" : "Nonaktif"}
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingChapter(chap);
                                setChapterForm({
                                  chapter_number: chap.chapter_number,
                                  name: chap.name,
                                  description: chap.description,
                                  color: chap.color,
                                });
                                setShowNewChapter(true);
                              }}
                              className="rounded-md p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
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
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {programChapters.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                      Belum ada bab di program ini. Klik <strong>Tambah Bab</strong> di atas!
                    </div>
                  )}
                </div>
              </section>

              {/* Vocabularies Panel (Arab + Arti ONLY!) */}
              <section className="space-y-4 lg:col-span-8">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                      {selectedProgram?.name || "Program"} {selectedChapter ? `• Bab ${selectedChapter.chapter_number}` : ""}
                    </div>
                    <h2 className="text-base font-bold text-white">
                      {selectedChapter ? selectedChapter.name : "Pilih atau tambah bab di sebelah kiri"}
                    </h2>
                  </div>
                  <button
                    disabled={!selectedChapter}
                    onClick={() => setShowBulkImport((s) => !s)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Import Cepat (Massal)
                  </button>
                </div>

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
                      Cukup tulis format <code className="text-amber-300">Arab | Arti</code> (tanpa cara baca):
                    </p>
                    <textarea
                      rows={5}
                      placeholder={"أَبٌ | Ayah\nأُمٌّ | Ibu\nأَخٌ | Saudara Laki-laki"}
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

                {selectedChapter && (
                  <form
                    onSubmit={handleSaveVocab}
                    className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        {editingVocab ? `Edit Mufrodat #${editingVocab.id}` : "+ Tambah Mufrodat (Arab & Arti Saja)"}
                      </span>
                      {editingVocab && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVocab(null);
                            setVocabForm({ arabic: "", meaning: "", tip: "" });
                          }}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Batal Edit
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                      <div className="sm:col-span-5">
                        <label className="mb-1 block text-[11px] font-semibold text-slate-400">
                          Tulisan Arab (berharakat) *
                        </label>
                        <input
                          type="text"
                          required
                          dir="rtl"
                          placeholder="كِتَابٌ"
                          value={vocabForm.arabic}
                          onChange={(e) => setVocabForm({ ...vocabForm, arabic: e.target.value })}
                          className="font-arabic w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xl text-white focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-5">
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
                      <div className="flex items-end sm:col-span-2">
                        <button
                          type="submit"
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-400 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300"
                        >
                          <Plus className="h-4 w-4" />
                          {editingVocab ? "Update" : "Tambah"}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari mufrodat (Arab atau arti)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/70 py-2 pl-10 pr-4 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {filteredVocabs.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 hover:border-slate-700"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-arabic text-2xl font-bold text-white" dir="rtl">
                          {v.arabic}
                        </div>
                        <p className="mt-0.5 text-sm font-semibold text-emerald-300">{v.meaning}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          onClick={() => {
                            setEditingVocab(v);
                            setVocabForm({ arabic: v.arabic, meaning: v.meaning, tip: v.tip });
                          }}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVocab(v)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-950 hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredVocabs.length === 0 && (
                    <div className="col-span-full rounded-xl border border-dashed border-slate-800 py-10 text-center text-sm text-slate-500">
                      Belum ada mufrodat di bab ini.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: SESI KUSTOM (KODE KELAS) ==================== */}
        {activeTab === "sesi" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Create Session Form */}
            <section className="lg:col-span-5">
              <form
                onSubmit={handleCreateSession}
                className="space-y-4 rounded-2xl border border-amber-400/30 bg-slate-900/80 p-5"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-400" />
                  <div>
                    <h2 className="text-base font-bold text-white">Buat Sesi Kustom Kelas</h2>
                    <p className="text-xs text-slate-400">
                      Siswa memasukkan Kode Sesi di Roblox untuk masuk ruangan khusus teman sekelas!
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Nama Sesi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Latihan Bab 1-3 Kelas 8A"
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Pilih Program *</label>
                  <select
                    value={sessionForm.program_id}
                    onChange={(e) => {
                      const pid = Number(e.target.value);
                      const pChaps = chapters.filter((c) => c.program_id === pid && c.is_active);
                      const minC = pChaps.length > 0 ? Math.min(...pChaps.map((c) => c.chapter_number)) : 1;
                      const maxC = pChaps.length > 0 ? Math.max(...pChaps.map((c) => c.chapter_number)) : 1;
                      setSessionForm({ ...sessionForm, program_id: pid, chapter_from: minC, chapter_to: maxC });
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.vocab_count ?? 0} kata)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">Dari Bab</label>
                    <select
                      value={sessionForm.chapter_from}
                      onChange={(e) => {
                        const fromVal = Number(e.target.value);
                        setSessionForm({
                          ...sessionForm,
                          chapter_from: fromVal,
                          chapter_to: Math.max(fromVal, sessionForm.chapter_to),
                        });
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      {sessionProgramChapters.map((c) => (
                        <option key={c.id} value={c.chapter_number}>
                          Bab {c.chapter_number} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">Sampai Bab</label>
                    <select
                      value={sessionForm.chapter_to}
                      onChange={(e) => setSessionForm({ ...sessionForm, chapter_to: Number(e.target.value) })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      {sessionProgramChapters
                        .filter((c) => c.chapter_number >= sessionForm.chapter_from)
                        .map((c) => (
                          <option key={c.id} value={c.chapter_number}>
                            Bab {c.chapter_number} — {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div
                  className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
                    sessionMatchingVocabCount >= 4
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-400/40 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  Terjaring: <strong>{sessionMatchingVocabCount} mufrodat</strong> (Bab {sessionForm.chapter_from} s/d Bab{" "}
                  {sessionForm.chapter_to})
                  {sessionMatchingVocabCount < 4 && " — disarankan minimal 4 mufrodat!"}
                </div>

                {/* Difficulty Preset Quick Pick */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">Tingkat Kesulitan</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["mudah", "sedang", "sulit"] as const).map((k) => (
                      <button
                        type="button"
                        key={k}
                        onClick={() => applySessionPreset(k)}
                        className={`rounded-lg border py-2 text-xs font-bold capitalize transition ${
                          sessionForm.difficulty_preset === k
                            ? "border-amber-400 bg-amber-400/20 text-amber-200"
                            : "border-slate-700 bg-slate-950 text-slate-400 hover:text-white"
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-slate-400">Kotak Benar</span>
                      <strong className="text-emerald-300">{sessionForm.correct_tiles_per_round}/16</strong>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={sessionForm.correct_tiles_per_round}
                      onChange={(e) =>
                        setSessionForm({
                          ...sessionForm,
                          difficulty_preset: "custom",
                          correct_tiles_per_round: Number(e.target.value),
                        })
                      }
                      className="w-full accent-emerald-400"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-slate-400">Waktu Ronde</span>
                      <strong className="text-amber-300">{sessionForm.round_time_seconds} dtk</strong>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={18}
                      step={0.5}
                      value={sessionForm.round_time_seconds}
                      onChange={(e) =>
                        setSessionForm({
                          ...sessionForm,
                          difficulty_preset: "custom",
                          round_time_seconds: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="text-slate-400">Jumlah Ronde</span>
                      <strong className="text-sky-300">{sessionForm.max_rounds} ronde</strong>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={20}
                      value={sessionForm.max_rounds}
                      onChange={(e) => setSessionForm({ ...sessionForm, max_rounds: Number(e.target.value) })}
                      className="w-full accent-sky-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-400">Arah Soal</label>
                    <select
                      value={sessionForm.question_mode}
                      onChange={(e) =>
                        setSessionForm({ ...sessionForm, question_mode: e.target.value as QuestionMode })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
                    >
                      <option value="auto">Campuran (Auto)</option>
                      <option value="ar_to_id">Arab → Arti</option>
                      <option value="id_to_ar_hard">Arti → Arab</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingSession}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 py-3 text-sm font-bold text-slate-950 hover:brightness-110 disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4" />
                  {creatingSession ? "Membuat Sesi..." : "Buat Sesi & Generate Kode"}
                </button>
              </form>
            </section>

            {/* Sessions List */}
            <section className="space-y-3 lg:col-span-7">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Daftar Sesi Kustom ({sessions.length})
              </h2>
              {sessions.map((ses) => (
                <div
                  key={ses.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-lg border border-amber-400/50 bg-amber-400/15 px-3 py-1 font-mono text-base font-black tracking-widest text-amber-300">
                        {ses.code}
                      </span>
                      <h3 className="text-sm font-bold text-white">{ses.title}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          ses.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {ses.is_active ? "Aktif" : "Ditutup"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Program: <strong className="text-slate-200">{ses.program_name}</strong> • Bab{" "}
                      <strong className="text-emerald-300">
                        {ses.chapter_from}–{ses.chapter_to}
                      </strong>{" "}
                      ({ses.vocab_count ?? 0} mufrodat) • {ses.max_rounds} ronde • {ses.round_time_seconds} dtk •{" "}
                      {ses.correct_tiles_per_round} kotak benar
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyText(ses.code, `ses-${ses.id}`)}
                      className="flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300"
                    >
                      {copiedKey === `ses-${ses.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      Salin Kode
                    </button>
                    <button
                      onClick={() => handleToggleSession(ses)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      {ses.is_active ? "Tutup" : "Aktifkan"}
                    </button>
                    <button
                      onClick={() => handleDeleteSession(ses)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-950 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-800 py-14 text-center text-sm text-slate-500">
                  Belum ada sesi kustom. Buat sesi di sebelah kiri untuk mendapatkan Kode Kelas!
                </div>
              )}
            </section>
          </div>
        )}

        {/* ==================== TAB 3: MODE UMUM & ARENA ==================== */}
        {activeTab === "kesulitan" && settings && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="space-y-5 lg:col-span-7">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                    Preset Kesulitan Mode Umum
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
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">{p.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-semibold text-white">Kotak Jawaban BENAR per Ronde</label>
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
                </div>

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
                        setSettings({ ...settings, difficulty_preset: "custom", round_time_seconds: Number(e.target.value) })
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
                      onChange={(e) => setSettings({ ...settings, max_rounds: Number(e.target.value) })}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">Mode Arah Soal (Arab ↔ Arti)</label>
                  <select
                    value={settings.question_mode}
                    onChange={(e) =>
                      setSettings({ ...settings, difficulty_preset: "custom", question_mode: e.target.value as QuestionMode })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  >
                    <option value="auto">Campuran Otomatis (Arab → Arti & Arti → Arab)</option>
                    <option value="ar_to_id">Soal Bahasa Arab → Ubin Arti Indonesia</option>
                    <option value="id_to_ar_hard">Soal Arti Indonesia → Ubin Bahasa Arab</option>
                  </select>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 py-3 text-sm font-bold text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingSettings ? "Menyimpan..." : "Simpan Pengaturan Mode Umum"}
                </button>
              </div>
            </section>

            <section className="lg:col-span-5">
              <div className="sticky top-32 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid2x2 className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Simulasi Lantai Arena 4×4</h3>
                  </div>
                  <button
                    onClick={() => setSimSeed((s) => s + 1)}
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Acak
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {simulatedTiles.map((optIdx, idx) => {
                    const style = OPTION_PALETTE[optIdx] || OPTION_PALETTE[1];
                    const sampleArabic = ["كِتَابٌ", "قَلَمٌ", "مَكْتَبٌ", "بَابٌ"][optIdx] || "قَلَمٌ";
                    return (
                      <div
                        key={idx}
                        className={`flex aspect-square flex-col items-center justify-center rounded-xl border-2 p-1.5 text-center ${style.bg} ${style.border}`}
                      >
                        <span className={`text-[9px] font-bold uppercase ${style.text}`}>
                          {optIdx === 0 ? "BENAR" : "SALAH"}
                        </span>
                        <span className="font-arabic text-lg font-bold text-white sm:text-xl">{sampleArabic}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ==================== TAB 4: PERINGKAT GLOBAL & PER PROGRAM ==================== */}
        {activeTab === "peringkat" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-white">
                  <Trophy className="h-5 w-5 text-amber-400" />
                  Papan Peringkat Global & Per Program
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Skor dari Mode Umum maupun Sesi Kustom otomatis masuk ke Peringkat Global dan Peringkat Program!
                </p>
              </div>
              <button
                onClick={loadAll}
                className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Segarkan
              </button>
            </div>

            {/* Filter Pills: Global + Each Program */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedLbFilter("global")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  selectedLbFilter === "global"
                    ? "bg-amber-400 text-slate-950"
                    : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Global Top 3 Podium & Papan Utama
              </button>
              {programLeaderboards.map((pl) => (
                <button
                  key={pl.programId}
                  onClick={() => setSelectedLbFilter(pl.programId)}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                    selectedLbFilter === pl.programId
                      ? "bg-emerald-400 text-slate-950"
                      : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pl.color }} />
                  {pl.programName} ({pl.entries.length})
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Pemain</th>
                      <th className="px-4 py-3">Pangkat</th>
                      <th className="px-4 py-3 text-right">Poin Rank (RP)</th>
                      <th className="px-4 py-3 text-right">Jawaban Benar</th>
                      <th className="px-4 py-3 text-right">Streak</th>
                      <th className="px-4 py-3 text-right">Menang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {displayedLeaderboard.map((p, idx) => (
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
                        <td className="px-4 py-3 text-right font-bold text-amber-300">{p.rank_points} RP</td>
                        <td className="px-4 py-3 text-right text-slate-200">{p.total_correct}</td>
                        <td className="px-4 py-3 text-right text-sky-300">x{p.best_streak}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-300">{p.wins}</td>
                      </tr>
                    ))}
                    {displayedLeaderboard.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                          Belum ada data peringkat untuk kategori ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ==================== TAB 5: INTEGRASI ROBLOX ==================== */}
        {activeTab === "integrasi" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="space-y-4 lg:col-span-6">
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="text-base font-bold text-white">Endpoint API untuk Roblox</h2>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Mode Umum (WebConfig.ApiUrl):</span>
                    <div className="mt-1 flex items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-slate-950 p-2.5">
                      <code className="truncate text-amber-300">{apiEndpointUrl}</code>
                      <button
                        onClick={() => copyText(apiEndpointUrl, "api")}
                        className="rounded-lg bg-amber-400 px-2.5 py-1 font-bold text-slate-950"
                      >
                        Salin
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Mode Kustom (otomatis dipanggil Roblox via Kode Sesi):</span>
                    <div className="mt-1 rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-emerald-300">
                      {originUrl}/api/roblox/sessions/{"<KODE_SESI>"}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Leaderboard Global & Per Program:</span>
                    <div className="mt-1 rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-sky-300">
                      {originUrl}/api/roblox/leaderboard
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section className="lg:col-span-6">
              <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Live Preview JSON Mode Umum</h3>
                  <button
                    onClick={loadRobloxPreview}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200"
                  >
                    Muat Ulang
                  </button>
                </div>
                <pre className="max-h-[420px] flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-300">
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
