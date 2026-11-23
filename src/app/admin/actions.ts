"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type Category = { id: string; category_type: "program" | "medium" };

async function requireStaff(next: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const { data: role } = await supabase.from("staff_roles").select("role").eq("user_id", user.sub).maybeSingle();
  if (!role) redirect("/admin");
  return supabase;
}

function moneyToCents(value: string) {
  const cents = Math.round(Number(value || "0") * 100);
  return Number.isFinite(cents) && cents >= 0 ? cents : null;
}

function classPayload(formData: FormData, existingMetadata: Record<string, unknown> = {}) {
  const title = text(formData, "title");
  const status = text(formData, "status");
  const priceCents = moneyToCents(text(formData, "price"));
  const memberPriceCents = moneyToCents(text(formData, "memberPrice"));
  const materialsFeeCents = moneyToCents(text(formData, "materialsFee"));
  const availability = text(formData, "availability") || "open";
  const capacityText = text(formData, "capacity");
  const capacity = capacityText ? Number(capacityText) : null;
  if (!title || !["draft", "published", "archived"].includes(status) || priceCents === null || memberPriceCents === null || materialsFeeCents === null || !["open", "waitlist", "info"].includes(availability) || (capacity !== null && (!Number.isInteger(capacity) || capacity < 1))) return null;
  return {
    title,
    status,
    short_description: text(formData, "summary") || null,
    description: text(formData, "description") || null,
    audience: text(formData, "audience") || null,
    starts_on: text(formData, "startsOn") || null,
    ends_on: text(formData, "endsOn") || null,
    location: text(formData, "location") || null,
    capacity,
    price_cents: priceCents,
    requires_registration: true,
    published_at: status === "published" ? new Date().toISOString() : null,
    metadata: {
      ...existingMetadata,
      course_code: text(formData, "courseCode") || null,
      instructor: text(formData, "instructor") || null,
      schedule_text: text(formData, "scheduleText") || null,
      time_text: text(formData, "timeText") || null,
      member_price_cents: memberPriceCents,
      materials_fee_cents: materialsFeeCents,
      availability,
    },
  };
}

async function replaceClassCategories(supabase: Awaited<ReturnType<typeof createClient>>, itemId: string, formData: FormData) {
  const selectedIds = [text(formData, "programCategory"), text(formData, "mediumCategory")].filter(Boolean);
  if (selectedIds.length !== 2) return "Choose one program category and one medium category.";
  const { data: categories, error: categoryError } = await supabase.from("catalog_categories").select("id,category_type").in("id", selectedIds).eq("is_active", true);
  if (categoryError || !categories || categories.length !== 2 || !categories.some((category: Category) => category.category_type === "program") || !categories.some((category: Category) => category.category_type === "medium")) return "Choose valid active categories.";
  const { error: deleteError } = await supabase.from("catalog_item_categories").delete().eq("catalog_item_id", itemId);
  if (deleteError) return deleteError.message;
  const { error: insertError } = await supabase.from("catalog_item_categories").insert(selectedIds.map((categoryId) => ({ catalog_item_id: itemId, category_id: categoryId })));
  return insertError?.message ?? null;
}

export async function createClass(formData: FormData) {
  const supabase = await requireStaff("/admin/classes/new");
  const payload = classPayload(formData);
  if (!payload) redirect("/admin/classes/new?error=Please+complete+the+required+class+details.");
  const { data: item, error } = await supabase.from("catalog_items").insert({ ...payload, item_type: "class", slug: `${slugify(payload.title)}-${Date.now().toString(36)}` }).select("id").single();
  if (error || !item) redirect(`/admin/classes/new?error=${encodeURIComponent(error?.message ?? "Could not save class.")}`);
  const categoryError = await replaceClassCategories(supabase, item.id, formData);
  if (categoryError) redirect(`/admin/classes/${item.id}?error=${encodeURIComponent(categoryError)}`);
  revalidatePath("/classes");
  revalidatePath("/admin");
  redirect("/admin/classes?message=Class+created");
}

export async function updateClass(formData: FormData) {
  const itemId = text(formData, "itemId");
  if (!itemId) redirect("/admin/classes");
  const supabase = await requireStaff(`/admin/classes/${itemId}`);
  const { data: existing } = await supabase.from("catalog_items").select("id,metadata").eq("id", itemId).eq("item_type", "class").maybeSingle();
  if (!existing) redirect("/admin/classes?error=Class+not+found.");
  const payload = classPayload(formData, (existing.metadata ?? {}) as Record<string, unknown>);
  if (!payload) redirect(`/admin/classes/${itemId}?error=Please+complete+the+required+class+details.`);
  const { error } = await supabase.from("catalog_items").update(payload).eq("id", itemId);
  if (error) redirect(`/admin/classes/${itemId}?error=${encodeURIComponent(error.message)}`);
  const categoryError = await replaceClassCategories(supabase, itemId, formData);
  if (categoryError) redirect(`/admin/classes/${itemId}?error=${encodeURIComponent(categoryError)}`);
  revalidatePath("/classes");
  revalidatePath("/admin");
  redirect("/admin/classes?message=Class+updated");
}

export async function createDonationFund(formData: FormData) {
  const name = text(formData, "name");
  if (!name) redirect("/admin/funds/new?error=Please+enter+a+fund+name.");
  const supabase = await createClient();
  const { error } = await supabase.from("donation_funds").insert({ name, slug: `${slugify(name)}-${Date.now().toString(36)}`, description: text(formData, "description") || null, is_active: true });
  if (error) redirect(`/admin/funds/new?error=${encodeURIComponent(error.message)}`);
  redirect("/admin/funds?message=Donation+fund+created");
}

export async function createCatalogItem(formData: FormData) {
  const title = text(formData, "title");
  const itemType = text(formData, "itemType");
  const status = text(formData, "status");
  const priceCents = Math.round(Number(text(formData, "price") || "0") * 100);
  const capacityText = text(formData, "capacity");
  if (!title || !["class", "camp", "event", "product", "membership"].includes(itemType) || !["draft", "published"].includes(status) || !Number.isFinite(priceCents) || priceCents < 0) {
    redirect("/admin/catalog/new?error=Please+complete+the+required+fields.");
  }

  const slug = `${slugify(title)}-${Date.now().toString(36)}`;
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_items").insert({
    title,
    slug,
    item_type: itemType,
    status,
    short_description: text(formData, "summary") || null,
    audience: text(formData, "audience") || null,
    starts_on: text(formData, "startsOn") || null,
    ends_on: text(formData, "endsOn") || null,
    location: text(formData, "location") || null,
    capacity: capacityText ? Number(capacityText) : null,
    price_cents: priceCents,
    inventory_quantity: itemType === "product" && capacityText ? Number(capacityText) : null,
    requires_registration: itemType !== "product",
    published_at: status === "published" ? new Date().toISOString() : null,
  });

  if (error) redirect(`/admin/catalog/new?error=${encodeURIComponent(error.message)}`);
  redirect("/admin?message=Catalog+item+created");
}
