import { createClient } from "@/lib/supabase/server";

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
