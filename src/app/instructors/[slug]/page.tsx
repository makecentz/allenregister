import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFrame } from "@/components/site-frame";
import { InstructorAvatar } from "@/components/instructor-avatar";
import { getPublishedInstructor } from "@/lib/instructors";

export const instant = false;

export default async function InstructorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const instructor = await getPublishedInstructor(slug);
  if (!instructor) notFound();
  return <SiteFrame><main className="instructor-profile"><Link className="browse-link" href="/instructors">← All instructors</Link><section><InstructorAvatar name={instructor.full_name} imageUrl={instructor.image_url} large /><div><p className="eyebrow">Allens Lane instructor</p><h1>{instructor.full_name}</h1><p className="instructor-bio">{instructor.biography ?? instructor.short_bio ?? "This instructor is part of the Allens Lane Art Center teaching community."}</p>{instructor.specialties.length ? <p className="instructor-specialties">{instructor.specialties.join(" · ")}</p> : null}{instructor.website_url ? <a className="button" href={instructor.website_url} rel="noreferrer" target="_blank">Visit website</a> : null}</div></section></main></SiteFrame>;
}
