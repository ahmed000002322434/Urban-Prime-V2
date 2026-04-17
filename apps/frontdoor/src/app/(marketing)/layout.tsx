import type { ReactNode } from "react";

import { DomainLayout } from "@/components/migration/DomainLayout";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <DomainLayout domain="marketing">{children}</DomainLayout>;
}
