"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/app/(tenant)/admin/actions/auth-actions";

interface ActionResult<T = undefined> {
  success: boolean;
  message?: string;
  data?: T;
}

export async function createTeam(
  name: string,
  colorCode: string
): Promise<ActionResult<any>> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("teams")
      .insert({ madrassa_id: madrassaId, name, color_code: colorCode } as any)
      .select()
      .single();

    if (error) {
      console.error("createTeam error:", error);
      return { success: false, message: "Failed to create team." };
    }

    revalidatePath("/admin/students");
    return { success: true, data };
  } catch (error) {
    console.error("createTeam error:", error);
    return { success: false, message: "Failed to create team." };
  }
}

export async function createCategory(
  name: string,
  startingNumber: number,
  isGeneral: boolean
): Promise<ActionResult<any>> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("categories")
      .insert({
        madrassa_id: madrassaId,
        name,
        starting_number: startingNumber,
        is_general: isGeneral,
      } as any)
      .select()
      .single();

    if (error) {
      console.error("createCategory error:", error);
      return { success: false, message: "Failed to create category." };
    }

    revalidatePath("/admin/students");
    return { success: true, data };
  } catch (error) {
    console.error("createCategory error:", error);
    return { success: false, message: "Failed to create category." };
  }
}

interface StudentRow {
  name: string;
  gender: string;
  class: string;
  category_id: string;
  team_id: string;
}

export interface FailedImportRow {
  row: number;
  name: string;
  error: string;
}

export interface BulkImportSummary {
  insertedCount: number;
  failedRows: FailedImportRow[];
}

/**
 * Imports students row-by-row instead of as a single batch insert.
 *
 * The previous implementation inserted the whole array in one Supabase call,
 * so a single bad row (e.g. an invalid category, a constraint violation)
 * caused the ENTIRE import to fail with no indication of which row or why.
 * Inserting one row at a time means valid rows still succeed, and every
 * failure is reported back with its original row number and the underlying
 * error message so the admin can fix just that row and re-upload.
 *
 * NOTE: pair this with a DB-level unique constraint —
 *   ALTER TABLE students ADD CONSTRAINT students_madrassa_category_regnum_unique
 *     UNIQUE (madrassa_id, category_id, register_number_3digit);
 * — so that concurrent imports can never silently produce duplicate
 * register numbers even if two admins import at the same time.
 */
export async function bulkImportStudents(
  studentsArray: StudentRow[]
): Promise<ActionResult<BulkImportSummary>> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

    if (!studentsArray || studentsArray.length === 0) {
      return { success: false, message: "No students to import." };
    }

    const supabase = await createClient();

    // Fetch categories to get starting_numbers, and to validate category_id
    // ownership before we ever attempt an insert.
    const categoryIds = [...new Set(studentsArray.map((s) => s.category_id))];

    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, starting_number")
      .in("id", categoryIds)
      .eq("madrassa_id", madrassaId);

    if (catError) {
      console.error("bulkImportStudents category fetch error:", catError);
      return { success: false, message: "Failed to load categories." };
    }

    const validCategoryIds = new Set((categories as any[] | null)?.map((c) => c.id) ?? []);

    // Map categoryId -> next register number counter
    const categoryCounters: Record<string, number> = {};
    for (const cat of (categories as any[]) ?? []) {
      categoryCounters[cat.id] = cat.starting_number;
    }

    // Fetch existing max register numbers per category to avoid collisions
    const { data: existingStudents, error: existErr } = await supabase
      .from("students")
      .select("category_id, register_number_3digit")
      .in("category_id", categoryIds)
      .eq("madrassa_id", madrassaId);

    if (existErr) {
      console.error("bulkImportStudents existing students fetch error:", existErr);
      return { success: false, message: "Failed to check existing register numbers." };
    }

    // Advance counters past existing max
    for (const s of (existingStudents as any[]) ?? []) {
      const current = categoryCounters[s.category_id] ?? 1;
      if (s.register_number_3digit >= current) {
        categoryCounters[s.category_id] = s.register_number_3digit + 1;
      }
    }

    const inserted: any[] = [];
    const failedRows: FailedImportRow[] = [];

    for (let i = 0; i < studentsArray.length; i++) {
      const student = studentsArray[i];
      const rowNumber = i + 1;

      if (!student.name || !student.name.trim()) {
        failedRows.push({ row: rowNumber, name: student.name || "(blank)", error: "Name is required." });
        continue;
      }

      if (!student.category_id || !validCategoryIds.has(student.category_id)) {
        failedRows.push({ row: rowNumber, name: student.name, error: "Invalid or unknown category." });
        continue;
      }

      const regNum = categoryCounters[student.category_id] ?? 1;

      const { data, error } = await supabase
        .from("students")
        .insert({
          madrassa_id: madrassaId,
          name: student.name,
          gender: student.gender,
          class: student.class,
          category_id: student.category_id,
          team_id: student.team_id || null,
          register_number_3digit: regNum,
        } as any)
        .select()
        .single();

      if (error) {
        console.error(`bulkImportStudents row ${rowNumber} insert error:`, error);
        failedRows.push({ row: rowNumber, name: student.name, error: error.message });
        // Don't advance the counter — the next student in this category
        // will retry this same register number instead of leaving a gap.
        continue;
      }

      categoryCounters[student.category_id] = regNum + 1;
      inserted.push(data);
    }

    revalidatePath("/admin/students");

    if (failedRows.length > 0) {
      return {
        success: inserted.length > 0,
        message: `Imported ${inserted.length} of ${studentsArray.length} students. ${failedRows.length} row(s) failed — see details below.`,
        data: { insertedCount: inserted.length, failedRows },
      };
    }

    return {
      success: true,
      data: { insertedCount: inserted.length, failedRows: [] },
    };
  } catch (error) {
    console.error("bulkImportStudents error:", error);
    return { success: false, message: "Failed to import students." };
  }
}
