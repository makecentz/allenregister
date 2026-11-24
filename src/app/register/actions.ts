"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function startRegistration(formData: FormData) {
  const catalogItemId = value(formData, "catalogItemId");
  const firstName = value(formData, "firstName");
  const lastName = value(formData, "lastName");
  const birthDate = value(formData, "birthDate") || null;
  const existingParticipantId = value(formData, "participantId");
  if (!catalogItemId || (!existingParticipantId && (!firstName || !lastName))) redirect(`/register/${catalogItemId}?error=Choose+a+saved+participant+or+complete+the+participant+details.`);

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect(`/signup?next=/register/${catalogItemId}`);

  const { data: item } = await supabase.from("catalog_items").select("id,price_cents").eq("id", catalogItemId).eq("status", "published").in("item_type", ["class", "camp"]).maybeSingle();
  if (!item) redirect("/classes");

  const { data: participant, error: participantError } = existingParticipantId
    ? await supabase.from("participants").select("id").eq("id", existingParticipantId).eq("account_id", user.sub).maybeSingle()
    : await supabase.from("participants").insert({ account_id: user.sub, first_name: firstName, last_name: lastName, birth_date: birthDate }).select("id").single();
  if (participantError || !participant) redirect(`/register/${catalogItemId}?error=${encodeURIComponent(participantError?.message ?? "Unable to save participant details.")}`);

  const { error } = await supabase.from("registrations").insert({ account_id: user.sub, catalog_item_id: item.id, participant_id: participant.id, price_cents: item.price_cents, status: "draft" });
  if (error) redirect(`/register/${catalogItemId}?error=${encodeURIComponent(error.code === "23505" ? "This participant already has a registration for this offering." : error.message)}`);
  redirect("/account?message=Registration+saved.+Payment+will+be+available+at+checkout+in+the+next+phase.");
}
