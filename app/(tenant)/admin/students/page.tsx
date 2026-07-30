"use client";

import { useState, useTransition, useRef } from "react";
import Papa from "papaparse";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createTeam, createCategory, bulkImportStudents } from "../actions/setup-actions";

// ── Types ──────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  color_code: string;
}

interface Category {
  id: string;
  name: string;
  starting_number: number;
  is_general: boolean;
}

interface ImportedStudent {
  name: string;
  gender: string;
  class: string;
  category_id: string;
  team_id: string;
  register_number_3digit?: number;
}

// ── Hardcoded madrassa ID – replace with auth context / tenant resolution ──
const MADRASSA_ID = "YOUR_MADRASSA_ID";

// ── Sub-components ─────────────────────────────────────────────────────────

function TeamsTab() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!name.trim()) { setError("Name required"); return; }
    setError("");
    startTransition(async () => {
      try {
        const team = await createTeam(MADRASSA_ID, name.trim(), color);
        
        if (team?.success && team?.data) {
          setTeams((prev) => [...prev, team.data as Team]);
          setName("");
        } else {
          setError(team?.message || "Failed to create team.");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Add Team</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Team name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-800 p-1"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Adding…" : "Add Team"}
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {teams.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Color</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {teams.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className="inline-block h-5 w-5 rounded-full border border-zinc-600"
                      style={{ backgroundColor: t.color_code }}
                    />
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{t.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [startNum, setStartNum] = useState(1);
  const [isGeneral, setIsGeneral] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!name.trim()) { setError("Name required"); return; }
    setError("");
    startTransition(async () => {
      try {
        const cat = await createCategory(MADRASSA_ID, name.trim(), startNum, isGeneral);
        
        if (cat?.success && cat?.data) {
          setCategories((prev) => [...prev, cat.data as Category]);
          setName("");
          setStartNum(1);
          setIsGeneral(false);
        } else {
          // Note: If your error state variable is named differently (e.g., setCatError), use that here!
          setError(cat?.message || "Failed to create category.");
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Add Category</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="number"
            min={1}
            className="w-32 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Start #"
            value={startNum}
            onChange={(e) => setStartNum(Number(e.target.value))}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={isGeneral}
            onChange={(e) => setIsGeneral(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
          />
          <span className="text-sm text-zinc-300">Is General Category</span>
        </label>
        <button
          onClick={handleAdd}
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Adding…" : "Add Category"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {categories.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Start #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">General</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-zinc-300">{c.starting_number}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.is_general ? "bg-emerald-900/50 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                      {c.is_general ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{c.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentsTab() {
  const [students, setStudents] = useState<ImportedStudent[]>([]);
  const [parseError, setParseError] = useState("");
  const [importError, setImportError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [imported, setImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    setImportError("");
    setImported(false);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        const mapped: ImportedStudent[] = rows.map((row) => ({
          name: row["Name"] ?? row["name"] ?? "",
          gender: row["Gender"] ?? row["gender"] ?? "",
          class: row["Class"] ?? row["class"] ?? "",
          category_id: row["Category ID"] ?? row["category_id"] ?? "",
          team_id: row["Team ID"] ?? row["team_id"] ?? "",
        }));

        if (mapped.some((s) => !s.name)) {
          setParseError("Some rows missing Name. Check CSV headers: Name, Gender, Class, Category ID, Team ID");
          return;
        }
        setStudents(mapped);
      },
      error: (err) => setParseError(err.message),
    });
  }

  function handleImport() {
    if (students.length === 0) return;
    setImportError("");
    startTransition(async () => {
      try {
        const result = await bulkImportStudents(MADRASSA_ID, students);
        // Merge register numbers from DB result
        if (result?.success) {
          setStudents(
            students.map((s, i) => ({
              ...s,
              register_number_3digit: Array.isArray(result.data) ? result.data[i]?.register_number_3digit : undefined,
            }))
          );
          setImported(true);
        } else {
          // Note: Use whatever your error state variable is named here, e.g., setErr or setError
          setImportError(result?.message || "Failed to import students.");
        }
      } catch (e: unknown) {
        setImportError(e instanceof Error ? e.message : "Import failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Bulk Import Students</h2>
        <p className="text-sm text-zinc-400">
          CSV headers required: <code className="bg-zinc-800 px-1 py-0.5 rounded text-indigo-400 text-xs">Name, Gender, Class, Category ID, Team ID</code>
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFile}
            className="block text-sm text-zinc-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500"
          />
          {students.length > 0 && !imported && (
            <button
              onClick={handleImport}
              disabled={isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isPending ? "Importing…" : `Import ${students.length} Students`}
            </button>
          )}
        </div>
        {parseError && <p className="text-sm text-red-400">{parseError}</p>}
        {importError && <p className="text-sm text-red-400">{importError}</p>}
        {imported && (
          <p className="text-sm text-emerald-400">✓ {students.length} students imported successfully.</p>
        )}
      </div>

      {students.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Preview — {students.length} rows</span>
            {imported && <span className="text-xs text-emerald-400 font-medium">Saved to DB</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800/50">
                <tr>
                  {["Reg #", "Name", "Gender", "Class", "Category ID", "Team ID"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {students.map((s, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-2 text-indigo-400 font-mono text-xs">
                      {s.register_number_3digit !== undefined
                        ? String(s.register_number_3digit).padStart(3, "0")
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-white">{s.name}</td>
                    <td className="px-4 py-2 text-zinc-300">{s.gender}</td>
                    <td className="px-4 py-2 text-zinc-300">{s.class}</td>
                    <td className="px-4 py-2 text-zinc-500 font-mono text-xs">{s.category_id || "—"}</td>
                    <td className="px-4 py-2 text-zinc-500 font-mono text-xs">{s.team_id || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Student Management</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage teams, categories, and bulk-import students.</p>
        </div>

        <Tabs defaultValue="students" className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 h-10">
            <TabsTrigger value="students" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400">
              Students
            </TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400">
              Teams
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400">
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <StudentsTab />
          </TabsContent>
          <TabsContent value="teams" className="mt-6">
            <TeamsTab />
          </TabsContent>
          <TabsContent value="categories" className="mt-6">
            <CategoriesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
