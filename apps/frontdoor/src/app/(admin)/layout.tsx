import type { ReactNode } from "react";

import { DomainLayout } from "@/components/migration/DomainLayout";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <DomainLayout domain="admin">{children}</DomainLayout>;
}
