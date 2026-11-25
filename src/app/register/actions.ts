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
  const next = value(formData, "next");
  const waitlistEntryId = value(formData, "waitlistEntryId");
  const campWaiverAccepted = value(formData, "campWaiverAccepted");
  if (!catalogItemId || (!existingParticipantId && (!firstName || !lastName)))
    redirect(
      `/register/${catalogItemId}?error=Choose+a+saved+participant+or+complete+the+participant+details.`,
    );

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect(`/signup?next=/register/${catalogItemId}`);

  const { data: item } = await supabase
    .from("catalog_items")
    .select("id,price_cents,item_type")
    .eq("id", catalogItemId)
    .eq("status", "published")
    .in("item_type", ["class", "camp"])
    .maybeSingle();
  if (!item) redirect("/classes");

  const { data: participant, error: participantError } = existingParticipantId
    ? await supabase
        .from("participants")
        .select("id")
        .eq("id", existingParticipantId)
        .eq("account_id", user.sub)
        .maybeSingle()
    : await supabase
        .from("participants")
        .insert({
          account_id: user.sub,
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate,
        })
        .select("id")
        .single();
  if (participantError || !participant)
    redirect(
      `/register/${catalogItemId}?error=${encodeURIComponent(participantError?.message ?? "Unable to save participant details.")}`,
    );

  if (item.item_type === "camp" && campWaiverAccepted !== "yes")
    redirect(
      `/register/${catalogItemId}?error=Please+review+and+accept+the+camp+participation+waiver.`,
    );

  if (item.item_type === "camp") {
    const { error: consentError } = await supabase
      .from("legal_consents")
      .upsert(
        {
          account_id: user.sub,
          participant_id: participant.id,
          catalog_item_id: item.id,
          document: "camp_waiver",
          version: "2026-11-25",
        },
        {
          onConflict:
            "account_id,participant_id,catalog_item_id,document,version",
        },
      );
    if (consentError)
      redirect(
        `/register/${catalogItemId}?error=${encodeURIComponent("Unable to record your camp waiver acknowledgment. Please try again.")}`,
      );
  }

  if (waitlistEntryId) {
    const { data: waitlistEntry } = await supabase
      .from("waitlist_entries")
      .select("id")
      .eq("id", waitlistEntryId)
      .eq("account_id", user.sub)
      .eq("catalog_item_id", item.id)
      .eq("participant_id", participant.id)
      .eq("status", "offered")
      .maybeSingle();
    if (!waitlistEntry)
      redirect(
        `/register/${catalogItemId}?error=This+waitlist+offer+is+no+longer+available.`,
      );
  }

  const { error } = await supabase
    .from("registrations")
    .insert({
      account_id: user.sub,
      catalog_item_id: item.id,
      participant_id: participant.id,
      price_cents: item.price_cents,
      status: "draft",
    });
  if (error)
    redirect(
      `/register/${catalogItemId}?error=${encodeURIComponent(error.code === "23505" ? "This participant already has a registration for this offering." : error.message)}`,
    );
  redirect(
    `${next === "/checkout" ? "/checkout" : "/account"}?message=Registration+saved.+Choose+payment+from+your+account.`,
  );
}
