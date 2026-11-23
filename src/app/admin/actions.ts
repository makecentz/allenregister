"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
