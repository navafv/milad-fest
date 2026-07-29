"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTeam(
  madrassaId: string,
  name: string,
  colorCode: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .insert({ madrassa_id: madrassaId, name, color_code: colorCode } as any)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/students");
  return data;
}

export async function createCategory(
  madrassaId: string,
  name: string,
  startingNumber: number,
  isGeneral: boolean
) {
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

  if (error) throw new Error(error.message);

  revalidatePath("/admin/students");
  return data;
}

interface StudentRow {
  name: string;
  gender: string;
  class: string;
  category_id: string;
  team_id: string;
}

export async function bulkImportStudents(
  madrassaId: string,
  studentsArray: StudentRow[]
) {
  const supabase = await createClient();

  // Fetch categories to get starting_numbers
  const categoryIds = [...new Set(studentsArray.map((s) => s.category_id))];

  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, starting_number")
    .in("id", categoryIds);

  if (catError) throw new Error(catError.message);

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

  if (existErr) throw new Error(existErr.message);

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

  if (error) throw new Error(error.message);

  revalidatePath("/admin/students");
  return data;
}
