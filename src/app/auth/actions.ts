"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function withMessage(path: string, key: "error" | "message", message: string) {
  return `${path}?${key}=${encodeURIComponent(message)}`;
}

function safeNext(formData: FormData) {
  const next = value(formData, "next");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export async function signUp(formData: FormData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  const fullName = value(formData, "fullName");
  const next = safeNext(formData);
  if (!email || password.length < 8) redirect(withMessage("/signup", "error", "Use a valid email and a password of at least 8 characters."));
  if (value(formData, "legalAccepted") !== "yes") redirect(withMessage("/signup", "error", "Please accept the Terms of Use and Privacy Policy to create an account."));

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) redirect(withMessage("/signup", "error", error.message));
  redirect(withMessage("/login", "message", "Check your email to confirm your account."));
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: value(formData, "email"), password: value(formData, "password") });
  if (error) redirect(withMessage("/login", "error", "We could not sign you in. Check your email and password."));
  redirect(safeNext(formData));
}

export async function sendPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.resetPasswordForEmail(value(formData, "email"), { redirectTo: `${origin}/auth/confirm?next=/update-password` });
  if (error) redirect(withMessage("/forgot-password", "error", error.message));
  redirect(withMessage("/login", "message", "If an account exists for this address, we sent password-reset instructions."));
}

export async function updatePassword(formData: FormData) {
  const password = value(formData, "password");
  if (password.length < 8) redirect(withMessage("/update-password", "error", "Use a password of at least 8 characters."));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(withMessage("/update-password", "error", error.message));
  redirect("/account");
}
