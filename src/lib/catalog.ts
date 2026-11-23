import { createClient } from "@/lib/supabase/server";

export type CatalogItem = {
  id: string;
  item_type: "class" | "camp" | "event" | "product" | "membership";
  title: string;
  short_description: string | null;
  audience: string | null;
  starts_on: string | null;
  ends_on: string | null;
  location: string | null;
  capacity: number | null;
  price_cents: number;
  inventory_quantity: number | null;
};

export function formatPrice(priceCents: number) {
  return priceCents === 0 ? "Free" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(priceCents / 100);
}

export async function getPublishedCatalogItems(itemType: CatalogItem["item_type"]) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_items")
    .select("id,item_type,title,short_description,audience,starts_on,ends_on,location,capacity,price_cents,inventory_quantity")
    .eq("item_type", itemType)
    .eq("status", "published")
    .order("starts_on", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true });

  return (data ?? []) as CatalogItem[];
}

export type DonationFund = { id: string; name: string; description: string | null };

export async function getActiveDonationFunds() {
  const supabase = await createClient();
  const { data } = await supabase.from("donation_funds").select("id,name,description").eq("is_active", true).order("sort_order", { ascending: true });
  return (data ?? []) as DonationFund[];
}
