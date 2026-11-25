"use server";

import { redirect } from "next/navigation";
import { escapeEmailHtml, sendTransactionalEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import {
  resolveAccountHolderParticipant,
} from "@/lib/participants";
import { ACCOUNT_HOLDER_PARTICIPANT_ID } from "@/lib/participant-constants";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function joinWaitlist(formData: FormData) {
  const itemId = value(formData, "itemId");
  const existingParticipantId = value(formData, "participantId");
  const firstName = value(formData, "firstName");
  const lastName = value(formData, "lastName");
  const birthDate = value(formData, "birthDate") || null;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect(`/signup?next=/waitlist/${itemId}`);
  if (!itemId || (!existingParticipantId && (!firstName || !lastName)))
    redirect(
      `/waitlist/${itemId}?error=Choose+a+saved+participant+or+complete+their+details.`,
    );

  const { data: item } = await supabase
    .from("catalog_items")
    .select("id,title")
    .eq("id", itemId)
    .eq("status", "published")
    .in("item_type", ["class", "camp"])
    .maybeSingle();
  if (!item) redirect("/classes");

  const profileName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const { participant, error: participantError } =
    existingParticipantId === ACCOUNT_HOLDER_PARTICIPANT_ID
      ? await resolveAccountHolderParticipant(user.sub, profileName)
      : existingParticipantId
        ? await supabase
            .from("participants")
            .select("id")
            .eq("id", existingParticipantId)
            .eq("account_id", user.sub)
            .maybeSingle()
            .then(({ data, error }) => ({ participant: data, error }))
        : await supabase
            .from("participants")
            .insert({
              account_id: user.sub,
              first_name: firstName,
              last_name: lastName,
              birth_date: birthDate,
            })
            .select("id")
            .single()
            .then(({ data, error }) => ({ participant: data, error }));
  if (participantError || !participant)
    redirect(
      `/waitlist/${itemId}?error=${encodeURIComponent(participantError?.message ?? "Unable to save participant details.")}`,
    );

  const { error } = await supabase.from("waitlist_entries").insert({
    account_id: user.sub,
    catalog_item_id: item.id,
    participant_id: participant.id,
  });
  if (error)
    redirect(
      `/waitlist/${itemId}?error=${encodeURIComponent(error.code === "23505" ? "That participant is already on this waitlist." : error.message)}`,
    );
  await sendTransactionalEmail({
    to: "tara@allenslane.org",
    subject: `Waitlist request: ${item.title}`,
    html: `<p>A customer joined the waitlist for <strong>${escapeEmailHtml(item.title)}</strong>.</p><p>Account: ${escapeEmailHtml(user.email ?? "No email supplied")}</p><p>Participant: ${escapeEmailHtml(`${participant.id}`)}</p>`,
    text: `A customer joined the waitlist for ${item.title}. Account: ${user.email ?? "No email supplied"}.`,
  });
  redirect("/account?message=You+have+been+added+to+the+waitlist.");
}

export async function withdrawFromWaitlist(formData: FormData) {
  const entryId = value(formData, "entryId");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");
  const { error } = await supabase
    .from("waitlist_entries")
    .update({ status: "withdrawn" })
    .eq("id", entryId);
  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`);
  redirect("/account?message=You+have+been+removed+from+the+waitlist.");
}
