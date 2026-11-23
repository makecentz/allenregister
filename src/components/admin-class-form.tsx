type Category = { id: string; name: string; category_type: "program" | "medium" };
type ClassRecord = {
  id?: string;
  title?: string | null;
  status?: string | null;
  short_description?: string | null;
  description?: string | null;
  audience?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  location?: string | null;
  capacity?: number | null;
  price_cents?: number | null;
  metadata?: Record<string, unknown> | null;
};

function dollars(cents: unknown) {
  return typeof cents === "number" ? (cents / 100).toFixed(2) : "0.00";
}

export function AdminClassForm({ action, categories, item, selectedCategoryIds = [] }: { action: (formData: FormData) => void | Promise<void>; categories: Category[]; item?: ClassRecord; selectedCategoryIds?: string[] }) {
  const metadata = item?.metadata ?? {};
  const programs = categories.filter((category) => category.category_type === "program");
  const media = categories.filter((category) => category.category_type === "medium");
  const selectedProgram = categories.find((category) => category.category_type === "program" && selectedCategoryIds.includes(category.id))?.id ?? "";
  const selectedMedium = categories.find((category) => category.category_type === "medium" && selectedCategoryIds.includes(category.id))?.id ?? "";
  return <form className="admin-form" action={action}>
    {item?.id ? <input type="hidden" name="itemId" value={item.id} /> : null}
    <div className="admin-form-grid"><label>Publication status<select name="status" defaultValue={item?.status ?? "draft"}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label>Availability<select name="availability" defaultValue={String(metadata.availability ?? "open")}><option value="open">Open for registration</option><option value="waitlist">Waitlist only</option><option value="info">Information only</option></select></label></div>
    <label>Class title<input name="title" required defaultValue={item?.title ?? ""} placeholder="e.g. Tuesday Morning Pottery" /></label>
    <div className="admin-form-grid"><label>Program category<select name="programCategory" required defaultValue={selectedProgram}><option value="" disabled>Choose a program</option>{programs.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Medium category<select name="mediumCategory" required defaultValue={selectedMedium}><option value="" disabled>Choose a medium</option>{media.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>
    <div className="admin-form-grid"><label>Course code<input name="courseCode" defaultValue={String(metadata.course_code ?? "")} placeholder="e.g. 27W-CER-0006" /></label><label>Instructor<input name="instructor" defaultValue={String(metadata.instructor ?? "")} placeholder="Instructor name" /></label><label>Audience<input name="audience" defaultValue={item?.audience ?? ""} placeholder="Adults or Youth" /></label><label>Location<input name="location" defaultValue={item?.location ?? ""} placeholder="Studio or room" /></label></div>
    <label>Schedule summary<input name="scheduleText" defaultValue={String(metadata.schedule_text ?? "")} placeholder="Tuesdays, January 5 – March 9 (10 sessions)" /></label><div className="admin-form-grid"><label>Start date<input name="startsOn" type="date" defaultValue={item?.starts_on ?? ""} /></label><label>End date<input name="endsOn" type="date" defaultValue={item?.ends_on ?? ""} /></label><label>Time<input name="timeText" defaultValue={String(metadata.time_text ?? "")} placeholder="6:30 PM – 9:30 PM" /></label><label>Capacity<input name="capacity" type="number" min="1" defaultValue={item?.capacity ?? ""} /></label></div>
    <div className="admin-form-grid"><label>Standard tuition (USD)<input name="price" inputMode="decimal" required defaultValue={dollars(item?.price_cents)} /></label><label>Member tuition (USD)<input name="memberPrice" inputMode="decimal" required defaultValue={dollars(metadata.member_price_cents)} /></label><label>Materials fee (USD)<input name="materialsFee" inputMode="decimal" required defaultValue={dollars(metadata.materials_fee_cents)} /></label></div>
    <label>Short customer summary<textarea name="summary" rows={3} defaultValue={item?.short_description ?? ""} placeholder="A concise card description" /></label><label>Full description<textarea name="description" rows={6} defaultValue={item?.description ?? ""} placeholder="Optional detail for the future class detail page" /></label>
    <button className="button button-primary">{item?.id ? "Save class" : "Create class"}</button>
  </form>;
}
