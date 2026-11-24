import type { ReactNode } from "react";
import { SiteFrame } from "@/components/site-frame";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <SiteFrame>{children}</SiteFrame>;
}
