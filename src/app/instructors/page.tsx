import Link from "next/link";
import { SiteFrame } from "@/components/site-frame";
import { InstructorAvatar } from "@/components/instructor-avatar";
import { getPublishedInstructors } from "@/lib/instructors";

export const instant = false;

export default async function InstructorsPage() {
  const instructors = await getPublishedInstructors();
  return <SiteFrame><main className="catalog-page instructor-page"><section className="catalog-intro"><p className="eyebrow">Learn with us</p><h1>Instructors at Allens Lane.</h1><p>Meet the artists, educators, and community builders who lead creative learning across our studios.</p></section><section className="instructor-grid" aria-label="Allens Lane instructors">{instructors.map((instructor) => <article className="instructor-card" key={instructor.id}><InstructorAvatar name={instructor.full_name} imageUrl={instructor.image_url} /><div><h2>{instructor.full_name}</h2><p>{instructor.short_bio ?? "Allens Lane Art Center instructor."}</p><Link className="text-link" href={`/instructors/${instructor.slug}`}>Meet {instructor.full_name.split(" ")[0]} <span aria-hidden="true">→</span></Link></div></article>)}</section></main></SiteFrame>;
}
