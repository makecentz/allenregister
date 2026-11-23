import Image from "next/image";

export function InstructorAvatar({ name, imageUrl, large = false }: { name: string; imageUrl: string | null; large?: boolean }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className={`instructor-avatar${large ? " instructor-avatar-large" : ""}`}>{imageUrl ? <Image src={imageUrl} alt={`Portrait of ${name}`} fill sizes={large ? "280px" : "82px"} /> : <span aria-hidden="true">{initials}</span>}</div>;
}
