import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_HOLDER_PARTICIPANT_ID } from "@/lib/participant-constants";

export { ACCOUNT_HOLDER_PARTICIPANT_ID };

function nameParts(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function accountHolderName(fullName: string | null | undefined) {
  const parts = nameParts(fullName ?? "");
  return parts
    ? { firstName: parts.firstName, lastName: parts.lastName }
    : null;
}

export async function resolveAccountHolderParticipant(
  accountId: string,
  fallbackFullName: string,
) {
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("participants")
    .select("id")
    .eq("account_id", accountId)
    .eq("is_account_holder", true)
    .maybeSingle();
  if (existingError) return { participant: null, error: existingError };
  if (existing) return { participant: existing, error: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", accountId)
    .maybeSingle();
  const name = accountHolderName(profile?.full_name || fallbackFullName);
  if (!name)
    return {
      participant: null,
      error: new Error(
        "Add your first and last name to your account profile before using it as a participant.",
      ),
    };

  const { data: participant, error } = await supabase
    .from("participants")
    .insert({
      account_id: accountId,
      first_name: name.firstName,
      last_name: name.lastName,
      is_account_holder: true,
    })
    .select("id")
    .single();
  if (!error) return { participant, error: null };

  // A second request may have created the account-holder participant first.
  if (error.code === "23505") {
    const { data: racedParticipant, error: racedError } = await supabase
      .from("participants")
      .select("id")
      .eq("account_id", accountId)
      .eq("is_account_holder", true)
      .maybeSingle();
    return { participant: racedParticipant, error: racedError };
  }
  return { participant: null, error };
}
