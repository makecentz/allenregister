import type { ReactNode } from "react";
import { SiteFrame } from "@/components/site-frame";

export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <SiteFrame>
      <main className="legal-page">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="small-note">Last updated {updated}</p>
        <div className="legal-copy">{children}</div>
      </main>
    </SiteFrame>
  );
}
