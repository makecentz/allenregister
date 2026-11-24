"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

async function accountClient() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login?next=/account");
  return { supabase, userId: claims.claims.sub };
}

export async function saveParticipant(formData: FormData) {
  const id = field(formData, "participantId");
  const firstName = field(formData, "firstName");
  const lastName = field(formData, "lastName");
  const birthDate = field(formData, "birthDate") || null;
  if (!firstName || !lastName) redirect("/account?error=Each+participant+needs+a+first+and+last+name.");
  const { supabase, userId } = await accountClient();
  const payload = { first_name: firstName, last_name: lastName, birth_date: birthDate };
  const { error } = id
    ? await supabase.from("participants").update(payload).eq("id", id).eq("account_id", userId)
    : await supabase.from("participants").insert({ ...payload, account_id: userId });
  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/account");
  redirect("/account?message=Participant+saved.");
}
