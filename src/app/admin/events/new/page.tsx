import Link from "next/link";
import { createEvent } from "@/app/admin/actions";
import { AdminEventForm } from "@/components/admin-event-form";
export const instant = false;
export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) { const { error } = await searchParams; return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">Allens Lane staff portal</p><h1>Create event</h1></div><Link className="admin-home" href="/admin/events">← Events</Link></header>{error ? <p className="form-error">{error}</p> : null}<AdminEventForm action={createEvent} /></main>; }
