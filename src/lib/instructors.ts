import { createClient } from "@/lib/supabase/server";
import type { CatalogItem } from "@/lib/catalog";

export type Instructor = {
  id: string;
  slug: string;
  full_name: string;
  short_bio: string | null;
  biography: string | null;
  image_url: string | null;
  website_url: string | null;
  specialties: string[];
};

export async function getPublishedInstructors() {
  const supabase = await createClient();
  const { data } = await supabase.from("instructors").select("id,slug,full_name,short_bio,biography,image_url,website_url,specialties").eq("status", "published").order("sort_order").order("full_name");
  return (data ?? []) as Instructor[];
}

export async function getPublishedInstructor(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("instructors").select("id,slug,full_name,short_bio,biography,image_url,website_url,specialties").eq("slug", slug).eq("status", "published").maybeSingle();
  return data as Instructor | null;
}

export async function getPublishedInstructorByName(fullName: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("instructors").select("slug,full_name").eq("status", "published").eq("full_name", fullName).maybeSingle();
  return data as Pick<Instructor, "slug" | "full_name"> | null;
}

export async function getPublishedClassesForInstructor(fullName: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("catalog_items").select("id,slug,item_type,title,short_description,description,audience,starts_on,ends_on,location,capacity,price_cents,inventory_quantity,metadata").eq("item_type", "class").eq("status", "published").order("starts_on", { ascending: true, nullsFirst: false });
  return ((data ?? []) as CatalogItem[]).filter((item) => String(item.metadata.instructor ?? "").trim().toLocaleLowerCase() === fullName.trim().toLocaleLowerCase());
}
