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

export async function bulkImportStudents(
  studentsArray: StudentRow[]
): Promise<ActionResult<any>> {
  try {
    const session = await verifySession();
    if (!session) return { success: false, message: "Unauthorized" };
    const madrassaId = session.madrassa_id;

    const supabase = await createClient();

    // Fetch categories to get starting_numbers
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

    const toInsert = studentsArray.map((student) => {
      const regNum = categoryCounters[student.category_id] ?? 1;
      categoryCounters[student.category_id] = regNum + 1;

      return {
        madrassa_id: madrassaId,
        name: student.name,
        gender: student.gender,
        class: student.class,
        category_id: student.category_id || null,
        team_id: student.team_id || null,
        register_number_3digit: regNum,
      };
    });

    const { data, error } = await supabase
      .from("students")
      .insert(toInsert as any)
      .select();

    if (error) {
      console.error("bulkImportStudents insert error:", error);
      return { success: false, message: "Failed to import students." };
    }

    revalidatePath("/admin/students");
    return { success: true, data };
  } catch (error) {
    console.error("bulkImportStudents error:", error);
    return { success: false, message: "Failed to import students." };
  }
}
