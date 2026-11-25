"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { escapeEmailHtml, sendTransactionalEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type Category = { id: string; category_type: "program" | "medium" };

async function requireStaff(next: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const { data: role } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", user.sub)
    .maybeSingle();
  if (!role) redirect("/admin");
  return supabase;
}

function moneyToCents(value: string) {
  const cents = Math.round(Number(value || "0") * 100);
  return Number.isFinite(cents) && cents >= 0 ? cents : null;
}

function instructorPayload(formData: FormData) {
  const fullName = text(formData, "fullName");
  const status = text(formData, "status");
  const sortOrder = Number(text(formData, "sortOrder") || "0");
  if (
    !fullName ||
    !["draft", "published", "archived"].includes(status) ||
    !Number.isInteger(sortOrder) ||
    sortOrder < 0
  )
    return null;
  const url = (name: string) => {
    const value = text(formData, name);
    if (!value) return null;
    try {
      return new URL(value).toString();
    } catch {
      return undefined;
    }
  };
  const imageUrl = url("imageUrl");
  const websiteUrl = url("websiteUrl");
  if (imageUrl === undefined || websiteUrl === undefined) return null;
  return {
    full_name: fullName,
    status,
    sort_order: sortOrder,
    short_bio: text(formData, "shortBio") || null,
    biography: text(formData, "biography") || null,
    image_url: imageUrl,
    website_url: websiteUrl,
    specialties: text(formData, "specialties")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    published_at: status === "published" ? new Date().toISOString() : null,
  };
}

export async function createInstructor(formData: FormData) {
  const supabase = await requireStaff("/admin/instructors/new");
  const payload = instructorPayload(formData);
  if (!payload)
    redirect(
      "/admin/instructors/new?error=Please+complete+the+required+details+and+use+valid+URLs.",
    );
  const { error } = await supabase.from("instructors").insert({
    ...payload,
    slug: `${slugify(payload.full_name)}-${Date.now().toString(36)}`,
  });
  if (error)
    redirect(
      `/admin/instructors/new?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/instructors");
  revalidatePath("/admin");
  redirect("/admin/instructors?message=Instructor+created");
}

export async function updateInstructor(formData: FormData) {
  const instructorId = text(formData, "instructorId");
  if (!instructorId) redirect("/admin/instructors");
  const supabase = await requireStaff(`/admin/instructors/${instructorId}`);
  const payload = instructorPayload(formData);
  if (!payload)
    redirect(
      `/admin/instructors/${instructorId}?error=Please+complete+the+required+details+and+use+valid+URLs.`,
    );
  const { error } = await supabase
    .from("instructors")
    .update(payload)
    .eq("id", instructorId);
  if (error)
    redirect(
      `/admin/instructors/${instructorId}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/instructors");
  revalidatePath("/admin");
  redirect("/admin/instructors?message=Instructor+updated");
}

function classPayload(
  formData: FormData,
  existingMetadata: Record<string, unknown> = {},
) {
  const title = text(formData, "title");
  const status = text(formData, "status");
  const priceCents = moneyToCents(text(formData, "price"));
  const memberPriceCents = moneyToCents(text(formData, "memberPrice"));
  const materialsFeeCents = moneyToCents(text(formData, "materialsFee"));
  const availability = text(formData, "availability") || "open";
  const capacityText = text(formData, "capacity");
  const capacity = capacityText ? Number(capacityText) : null;
  if (
    !title ||
    !["draft", "published", "archived"].includes(status) ||
    priceCents === null ||
    memberPriceCents === null ||
    materialsFeeCents === null ||
    !["open", "waitlist", "info"].includes(availability) ||
    (capacity !== null && (!Number.isInteger(capacity) || capacity < 1))
  )
    return null;
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

function campPayload(
  formData: FormData,
  existingMetadata: Record<string, unknown> = {},
) {
  const title = text(formData, "title");
  const status = text(formData, "status");
  const priceCents = moneyToCents(text(formData, "price"));
  const earlyBirdCents = moneyToCents(text(formData, "earlyBirdPrice"));
  const afterCareCents = moneyToCents(text(formData, "afterCarePrice"));
  const capacityText = text(formData, "capacity");
  const capacity = capacityText ? Number(capacityText) : null;
  if (
    !title ||
    !["draft", "published", "archived"].includes(status) ||
    priceCents === null ||
    earlyBirdCents === null ||
    afterCareCents === null ||
    (capacity !== null && (!Number.isInteger(capacity) || capacity < 1))
  )
    return null;
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
      schedule_text: text(formData, "scheduleText") || null,
      age_range: text(formData, "ageRange") || null,
      theme: text(formData, "theme") || null,
      early_bird_price_cents: earlyBirdCents,
      aftercare_price_cents: afterCareCents,
      beforecare_text: text(formData, "beforeCare") || null,
    },
  };
}

export async function createCamp(formData: FormData) {
  const supabase = await requireStaff("/admin/camp/new");
  const payload = campPayload(formData);
  if (!payload)
    redirect(
      "/admin/camp/new?error=Please+complete+the+required+camp+details.",
    );
  const { error } = await supabase.from("catalog_items").insert({
    ...payload,
    item_type: "camp",
    slug: `${slugify(payload.title)}-${Date.now().toString(36)}`,
  });
  if (error)
    redirect(`/admin/camp/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/camp");
  revalidatePath("/admin");
  redirect("/admin/camp?message=Camp+session+created");
}

export async function updateCamp(formData: FormData) {
  const itemId = text(formData, "itemId");
  if (!itemId) redirect("/admin/camp");
  const supabase = await requireStaff(`/admin/camp/${itemId}`);
  const { data: existing } = await supabase
    .from("catalog_items")
    .select("metadata")
    .eq("id", itemId)
    .eq("item_type", "camp")
    .maybeSingle();
  if (!existing) redirect("/admin/camp?error=Camp+session+not+found.");
  const payload = campPayload(
    formData,
    (existing.metadata ?? {}) as Record<string, unknown>,
  );
  if (!payload)
    redirect(
      `/admin/camp/${itemId}?error=Please+complete+the+required+camp+details.`,
    );
  const { error } = await supabase
    .from("catalog_items")
    .update(payload)
    .eq("id", itemId);
  if (error)
    redirect(
      `/admin/camp/${itemId}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/camp");
  revalidatePath("/admin");
  redirect("/admin/camp?message=Camp+session+updated");
}

function productPayload(
  formData: FormData,
  existingMetadata: Record<string, unknown> = {},
) {
  const title = text(formData, "title");
  const status = text(formData, "status");
  const priceCents = moneyToCents(text(formData, "price"));
  const inventoryText = text(formData, "inventoryQuantity");
  const inventoryQuantity = inventoryText ? Number(inventoryText) : null;
  const imageUrl = text(formData, "imageUrl");
  if (
    !title ||
    !["draft", "published", "archived"].includes(status) ||
    priceCents === null ||
    (inventoryQuantity !== null &&
      (!Number.isInteger(inventoryQuantity) || inventoryQuantity < 0))
  )
    return null;
  if (imageUrl) {
    try {
      new URL(imageUrl);
    } catch {
      return null;
    }
  }
  return {
    title,
    status,
    short_description: text(formData, "summary") || null,
    description: text(formData, "description") || null,
    audience: text(formData, "category") || "Shop",
    price_cents: priceCents,
    inventory_quantity: inventoryQuantity,
    image_path: imageUrl || null,
    requires_registration: false,
    published_at: status === "published" ? new Date().toISOString() : null,
    metadata: {
      ...existingMetadata,
      sku: text(formData, "sku") || null,
      material: text(formData, "material") || null,
      fulfillment: text(formData, "fulfillment") || "pickup",
      taxable: text(formData, "taxable") === "yes",
    },
  };
}

export async function createProduct(formData: FormData) {
  const supabase = await requireStaff("/admin/products/new");
  const payload = productPayload(formData);
  if (!payload)
    redirect(
      "/admin/products/new?error=Please+complete+the+required+product+details.",
    );
  const { error } = await supabase.from("catalog_items").insert({
    ...payload,
    item_type: "product",
    slug: `${slugify(payload.title)}-${Date.now().toString(36)}`,
  });
  if (error)
    redirect(`/admin/products/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/shop");
  revalidatePath("/admin");
  redirect("/admin/products?message=Product+created");
}

export async function updateProduct(formData: FormData) {
  const itemId = text(formData, "itemId");
  if (!itemId) redirect("/admin/products");
  const supabase = await requireStaff(`/admin/products/${itemId}`);
  const { data: existing } = await supabase
    .from("catalog_items")
    .select("metadata")
    .eq("id", itemId)
    .eq("item_type", "product")
    .maybeSingle();
  if (!existing) redirect("/admin/products?error=Product+not+found.");
  const payload = productPayload(
    formData,
    (existing.metadata ?? {}) as Record<string, unknown>,
  );
  if (!payload)
    redirect(
      `/admin/products/${itemId}?error=Please+complete+the+required+product+details.`,
    );
  const { error } = await supabase
    .from("catalog_items")
    .update(payload)
    .eq("id", itemId);
  if (error)
    redirect(
      `/admin/products/${itemId}?error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/shop");
  revalidatePath("/admin");
  redirect("/admin/products?message=Product+updated");
}

function eventPayload(
  formData: FormData,
  existingMetadata: Record<string, unknown> = {},
) {
  const title = text(formData, "title");
  const status = text(formData, "status");
  const startsAt = text(formData, "startsAt");
  const endsAt = text(formData, "endsAt");
  const capacityText = text(formData, "capacity");
  const capacity = capacityText ? Number(capacityText) : null;
  if (
    !title ||
    !["draft", "published", "archived"].includes(status) ||
    !startsAt ||
    !endsAt ||
    new Date(endsAt) <= new Date(startsAt) ||
    (capacity !== null && (!Number.isInteger(capacity) || capacity < 1))
  )
    return null;
  const tiers = text(formData, "ticketTiers")
    .split("\n")
    .map((line, index) => {
      const [name, price, tierCapacity] = line
        .split("|")
        .map((value) => value.trim());
      const priceCents = moneyToCents(price);
      const parsedCapacity = tierCapacity ? Number(tierCapacity) : null;
      return { name, priceCents, capacity: parsedCapacity, sort_order: index };
    })
    .filter(
      (tier) => tier.name || tier.priceCents !== 0 || tier.capacity !== null,
    );
  if (
    !tiers.length ||
    tiers.some(
      (tier) =>
        !tier.name ||
        tier.priceCents === null ||
        (tier.capacity !== null &&
          (!Number.isInteger(tier.capacity) || tier.capacity < 1)),
    )
  )
    return null;
  return {
    item: {
      title,
      status,
      short_description: text(formData, "summary") || null,
      description: text(formData, "description") || null,
      audience: text(formData, "eventType") || "Event",
      starts_on: startsAt.slice(0, 10),
      ends_on: endsAt.slice(0, 10),
      location: text(formData, "location") || null,
      capacity,
      price_cents: Math.min(...tiers.map((tier) => tier.priceCents ?? 0)),
      requires_registration: false,
      published_at: status === "published" ? new Date().toISOString() : null,
      metadata: {
        ...existingMetadata,
        presenter: text(formData, "presenter") || null,
      },
    },
    session: {
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      capacity,
      location: text(formData, "location") || null,
    },
    tiers,
  };
}

export async function createEvent(formData: FormData) {
  const supabase = await requireStaff("/admin/events/new");
  const payload = eventPayload(formData);
  if (!payload)
    redirect(
      "/admin/events/new?error=Please+complete+the+event,+session,+and+at+least+one+valid+ticket+tier.",
    );
  const { data: event, error } = await supabase
    .from("catalog_items")
    .insert({
      ...payload.item,
      item_type: "event",
      slug: `${slugify(payload.item.title)}-${Date.now().toString(36)}`,
    })
    .select("id")
    .single();
  if (error || !event)
    redirect(
      `/admin/events/new?error=${encodeURIComponent(error?.message ?? "Unable to save event.")}`,
    );
  const { data: session, error: sessionError } = await supabase
    .from("catalog_sessions")
    .insert({ ...payload.session, catalog_item_id: event.id })
    .select("id")
    .single();
  if (sessionError || !session)
    redirect(
      `/admin/events/${event.id}?error=${encodeURIComponent(sessionError?.message ?? "Unable to save session.")}`,
    );
  const { error: tierError } = await supabase
    .from("ticket_types")
    .insert(
      payload.tiers.map((tier) => ({ ...tier, event_session_id: session.id })),
    );
  if (tierError)
    redirect(
      `/admin/events/${event.id}?error=${encodeURIComponent(tierError.message)}`,
    );
  revalidatePath("/events");
  revalidatePath("/admin");
  redirect("/admin/events?message=Event+created");
}

export async function updateEvent(formData: FormData) {
  const itemId = text(formData, "itemId");
  if (!itemId) redirect("/admin/events");
  const supabase = await requireStaff(`/admin/events/${itemId}`);
  const { data: existing } = await supabase
    .from("catalog_items")
    .select("metadata")
    .eq("id", itemId)
    .eq("item_type", "event")
    .maybeSingle();
  const { data: session } = await supabase
    .from("catalog_sessions")
    .select("id")
    .eq("catalog_item_id", itemId)
    .order("starts_at")
    .limit(1)
    .maybeSingle();
  if (!existing || !session)
    redirect("/admin/events?error=Event+session+not+found.");
  const payload = eventPayload(
    formData,
    (existing.metadata ?? {}) as Record<string, unknown>,
  );
  if (!payload)
    redirect(
      `/admin/events/${itemId}?error=Please+complete+the+event,+session,+and+at+least+one+valid+ticket+tier.`,
    );
  const { error: eventError } = await supabase
    .from("catalog_items")
    .update(payload.item)
    .eq("id", itemId);
  if (eventError)
    redirect(
      `/admin/events/${itemId}?error=${encodeURIComponent(eventError.message)}`,
    );
  const { error: sessionError } = await supabase
    .from("catalog_sessions")
    .update(payload.session)
    .eq("id", session.id);
  if (sessionError)
    redirect(
      `/admin/events/${itemId}?error=${encodeURIComponent(sessionError.message)}`,
    );
  const { error: removeError } = await supabase
    .from("ticket_types")
    .delete()
    .eq("event_session_id", session.id);
  if (removeError)
    redirect(
      `/admin/events/${itemId}?error=${encodeURIComponent(removeError.message)}`,
    );
  const { error: tierError } = await supabase
    .from("ticket_types")
    .insert(
      payload.tiers.map((tier) => ({ ...tier, event_session_id: session.id })),
    );
  if (tierError)
    redirect(
      `/admin/events/${itemId}?error=${encodeURIComponent(tierError.message)}`,
    );
  revalidatePath("/events");
  revalidatePath("/admin/events");
  redirect("/admin/events?message=Event+updated");
}

export async function checkInTicket(formData: FormData) {
  const ticketId = text(formData, "ticketId");
  const supabase = await requireStaff("/admin/check-in");
  if (!ticketId) redirect("/admin/check-in");
  const { data: claims } = await supabase.auth.getClaims();
  const { error } = await supabase
    .from("tickets")
    .update({
      status: "checked_in",
      checked_in_at: new Date().toISOString(),
      checked_in_by: claims?.claims?.sub,
    })
    .eq("id", ticketId)
    .eq("status", "issued");
  if (error)
    redirect(`/admin/check-in?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/check-in");
  redirect("/admin/check-in?message=Ticket+checked+in");
}

export async function checkInTicketByCode(formData: FormData) {
  const ticketCode = text(formData, "ticketCode")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const supabase = await requireStaff("/admin/check-in");
  if (!ticketCode) redirect("/admin/check-in?error=Enter+a+ticket+code.");
  const { data: ticket, error: lookupError } = await supabase
    .from("tickets")
    .select("id,status")
    .eq("ticket_code", ticketCode)
    .maybeSingle();
  if (lookupError || !ticket)
    redirect("/admin/check-in?error=Ticket+not+found.");
  if (ticket.status === "checked_in")
    redirect("/admin/check-in?error=This+ticket+has+already+been+checked+in.");
  if (ticket.status !== "issued")
    redirect("/admin/check-in?error=This+ticket+is+not+valid+for+check-in.");
  const { data: claims } = await supabase.auth.getClaims();
  const { error } = await supabase
    .from("tickets")
    .update({
      status: "checked_in",
      checked_in_at: new Date().toISOString(),
      checked_in_by: claims?.claims?.sub,
    })
    .eq("id", ticket.id)
    .eq("status", "issued");
  if (error)
    redirect(`/admin/check-in?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/check-in");
  redirect("/admin/check-in?message=Ticket+checked+in");
}

export async function toggleRegistrationAttendance(formData: FormData) {
  const registrationId = text(formData, "registrationId");
  const offeringId = text(formData, "offeringId");
  const attendedOn = text(formData, "attendedOn");
  const present = text(formData, "present") === "true";
  const supabase = await requireStaff(
    `/admin/attendance?offeringId=${encodeURIComponent(offeringId)}&date=${encodeURIComponent(attendedOn)}`,
  );
  if (!registrationId || !offeringId || !/^\d{4}-\d{2}-\d{2}$/.test(attendedOn))
    redirect("/admin/attendance?error=Choose+an+offering+and+attendance+date.");
  const { data: claims } = await supabase.auth.getClaims();
  const { error } = present
    ? await supabase.from("registration_attendance").upsert(
        {
          registration_id: registrationId,
          attended_on: attendedOn,
          recorded_by: claims?.claims?.sub,
        },
        { onConflict: "registration_id,attended_on" },
      )
    : await supabase
        .from("registration_attendance")
        .delete()
        .eq("registration_id", registrationId)
        .eq("attended_on", attendedOn);
  if (error)
    redirect(
      `/admin/attendance?offeringId=${encodeURIComponent(offeringId)}&date=${encodeURIComponent(attendedOn)}&error=${encodeURIComponent(error.message)}`,
    );
  revalidatePath("/admin/attendance");
  redirect(
    `/admin/attendance?offeringId=${encodeURIComponent(offeringId)}&date=${encodeURIComponent(attendedOn)}&message=Attendance+updated.`,
  );
}

async function replaceClassCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
  formData: FormData,
) {
  const selectedIds = [
    text(formData, "programCategory"),
    text(formData, "mediumCategory"),
  ].filter(Boolean);
  if (selectedIds.length !== 2)
    return "Choose one program category and one medium category.";
  const { data: categories, error: categoryError } = await supabase
    .from("catalog_categories")
    .select("id,category_type")
    .in("id", selectedIds)
    .eq("is_active", true);
  if (
    categoryError ||
    !categories ||
    categories.length !== 2 ||
    !categories.some(
      (category: Category) => category.category_type === "program",
    ) ||
    !categories.some(
      (category: Category) => category.category_type === "medium",
    )
  )
    return "Choose valid active categories.";
  const { error: deleteError } = await supabase
    .from("catalog_item_categories")
    .delete()
    .eq("catalog_item_id", itemId);
  if (deleteError) return deleteError.message;
  const { error: insertError } = await supabase
    .from("catalog_item_categories")
    .insert(
      selectedIds.map((categoryId) => ({
        catalog_item_id: itemId,
        category_id: categoryId,
      })),
    );
  return insertError?.message ?? null;
}

export async function createClass(formData: FormData) {
  const supabase = await requireStaff("/admin/classes/new");
  const payload = classPayload(formData);
  if (!payload)
    redirect(
      "/admin/classes/new?error=Please+complete+the+required+class+details.",
    );
  const { data: item, error } = await supabase
    .from("catalog_items")
    .insert({
      ...payload,
      item_type: "class",
      slug: `${slugify(payload.title)}-${Date.now().toString(36)}`,
    })
    .select("id")
    .single();
  if (error || !item)
    redirect(
      `/admin/classes/new?error=${encodeURIComponent(error?.message ?? "Could not save class.")}`,
    );
  const categoryError = await replaceClassCategories(
    supabase,
    item.id,
    formData,
  );
  if (categoryError)
    redirect(
      `/admin/classes/${item.id}?error=${encodeURIComponent(categoryError)}`,
    );
  revalidatePath("/classes");
  revalidatePath("/admin");
  redirect("/admin/classes?message=Class+created");
}

export async function updateClass(formData: FormData) {
  const itemId = text(formData, "itemId");
  if (!itemId) redirect("/admin/classes");
  const supabase = await requireStaff(`/admin/classes/${itemId}`);
  const { data: existing } = await supabase
    .from("catalog_items")
    .select("id,metadata")
    .eq("id", itemId)
    .eq("item_type", "class")
    .maybeSingle();
  if (!existing) redirect("/admin/classes?error=Class+not+found.");
  const payload = classPayload(
    formData,
    (existing.metadata ?? {}) as Record<string, unknown>,
  );
  if (!payload)
    redirect(
      `/admin/classes/${itemId}?error=Please+complete+the+required+class+details.`,
    );
  const { error } = await supabase
    .from("catalog_items")
    .update(payload)
    .eq("id", itemId);
  if (error)
    redirect(
      `/admin/classes/${itemId}?error=${encodeURIComponent(error.message)}`,
    );
  const categoryError = await replaceClassCategories(
    supabase,
    itemId,
    formData,
  );
  if (categoryError)
    redirect(
      `/admin/classes/${itemId}?error=${encodeURIComponent(categoryError)}`,
    );
  revalidatePath("/classes");
  revalidatePath("/admin");
  redirect("/admin/classes?message=Class+updated");
}

export async function createDonationFund(formData: FormData) {
  const name = text(formData, "name");
  if (!name) redirect("/admin/funds/new?error=Please+enter+a+fund+name.");
  const supabase = await createClient();
  const { error } = await supabase.from("donation_funds").insert({
    name,
    slug: `${slugify(name)}-${Date.now().toString(36)}`,
    description: text(formData, "description") || null,
    is_active: true,
  });
  if (error)
    redirect(`/admin/funds/new?error=${encodeURIComponent(error.message)}`);
  redirect("/admin/funds?message=Donation+fund+created");
}

export async function createCatalogItem(formData: FormData) {
  const title = text(formData, "title");
  const itemType = text(formData, "itemType");
  const status = text(formData, "status");
  const priceCents = Math.round(Number(text(formData, "price") || "0") * 100);
  const capacityText = text(formData, "capacity");
  if (
    !title ||
    !["class", "camp", "event", "product", "membership"].includes(itemType) ||
    !["draft", "published"].includes(status) ||
    !Number.isFinite(priceCents) ||
    priceCents < 0
  ) {
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
    inventory_quantity:
      itemType === "product" && capacityText ? Number(capacityText) : null,
    requires_registration: itemType !== "product",
    published_at: status === "published" ? new Date().toISOString() : null,
  });

  if (error)
    redirect(`/admin/catalog/new?error=${encodeURIComponent(error.message)}`);
  redirect("/admin?message=Catalog+item+created");
}

export async function updateWaitlistEntry(formData: FormData) {
  const entryId = text(formData, "entryId");
  const status = text(formData, "status");
  if (
    !entryId ||
    !["waiting", "offered", "enrolled", "withdrawn"].includes(status)
  )
    redirect("/admin/waitlist?error=Choose+a+valid+waitlist+status.");
  const supabase = await requireStaff("/admin/waitlist");
  const { data: existingEntry } = await supabase
    .from("waitlist_entries")
    .select("account_id,status,catalog_items(title)")
    .eq("id", entryId)
    .maybeSingle();
  const { error } = await supabase
    .from("waitlist_entries")
    .update({
      status,
      staff_note: text(formData, "staffNote") || null,
      offered_at: status === "offered" ? new Date().toISOString() : null,
    })
    .eq("id", entryId);
  if (error)
    redirect(`/admin/waitlist?error=${encodeURIComponent(error.message)}`);
  if (
    status === "offered" &&
    existingEntry?.status !== "offered" &&
    existingEntry?.account_id
  ) {
    try {
      const { data: userData } = await createAdminClient().auth.admin.getUserById(
        existingEntry.account_id,
      );
      const catalogItem = existingEntry.catalog_items as unknown as
        | { title?: string }
        | null;
      const title = catalogItem?.title ?? "your selected program";
      await sendTransactionalEmail({
        to: userData.user?.email,
        subject: `A space is available: ${title}`,
        html: `<p>Good news — a space is available for <strong>${escapeEmailHtml(title)}</strong>.</p><p>Sign in to your Allens Lane account to complete registration and payment.</p>`,
        text: `Good news — a space is available for ${title}. Sign in to your Allens Lane account to complete registration and payment.`,
      });
    } catch {
      // The status update is preserved if a notification service is unavailable.
    }
  }
  revalidatePath("/account");
  revalidatePath("/admin/waitlist");
  redirect("/admin/waitlist?message=Waitlist+entry+updated");
}

export async function sendProgramEmail(formData: FormData) {
  const catalogItemId = text(formData, "catalogItemId");
  const subject = text(formData, "subject");
  const message = text(formData, "message");
  if (!catalogItemId || !subject || !message || subject.length > 160 || message.length > 5000)
    redirect("/admin/communications?error=Choose+an+offering+and+enter+a+subject+and+message.");

  const supabase = await requireStaff("/admin/communications");
  const { data: claims } = await supabase.auth.getClaims();
  const { data: offering } = await supabase
    .from("catalog_items")
    .select("id,title,item_type")
    .eq("id", catalogItemId)
    .in("item_type", ["class", "camp"])
    .maybeSingle();
  if (!offering)
    redirect("/admin/communications?error=Choose+a+valid+class+or+camp+session.");

  const { data: registrations } = await supabase
    .from("registrations")
    .select("account_id")
    .eq("catalog_item_id", offering.id)
    .eq("status", "confirmed");
  const accountIds = [
    ...new Set((registrations ?? []).map((registration) => registration.account_id)),
  ];
  if (!accountIds.length)
    redirect("/admin/communications?error=There+are+no+confirmed+households+to+email+for+this+offering.");
  if (accountIds.length > 100)
    redirect("/admin/communications?error=This+offering+has+more+than+100+households.+Please+contact+the+site+administrator+for+a+bulk-send+export.");

  const users = await Promise.all(
    accountIds.map((accountId) =>
      createAdminClient().auth.admin.getUserById(accountId),
    ),
  );
  const recipients = [
    ...new Set(
      users
        .map(({ data }) => data.user?.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email)),
    ),
  ];
  if (!recipients.length)
    redirect("/admin/communications?error=No+deliverable+email+addresses+were+found+for+this+offering.");

  const htmlMessage = escapeEmailHtml(message).replace(/\n/g, "<br />");
  const results = await Promise.all(
    recipients.map((recipient) =>
      sendTransactionalEmail({
        to: recipient,
        subject,
        html: `<p><strong>${escapeEmailHtml(offering.title)}</strong></p><p>${htmlMessage}</p><p>Allens Lane Art Center</p>`,
        text: `${offering.title}\n\n${message}\n\nAllens Lane Art Center`,
      }),
    ),
  );
  const recipientCount = results.filter((result) => result.delivered).length;
  if (!recipientCount)
    redirect("/admin/communications?error=The+email+service+did+not+accept+the+message.+Check+the+Resend+configuration+and+try+again.");

  const { error: logError } = await supabase.from("program_email_log").insert({
    sent_by: claims?.claims?.sub,
    catalog_item_id: offering.id,
    subject,
    message,
    recipient_count: recipientCount,
  });
  if (logError)
    redirect(`/admin/communications?error=${encodeURIComponent(logError.message)}`);
  revalidatePath("/admin/communications");
  redirect(
    `/admin/communications?message=${encodeURIComponent(`Email accepted for delivery to ${recipientCount} household${recipientCount === 1 ? "" : "s"}.`)}`,
  );
}
