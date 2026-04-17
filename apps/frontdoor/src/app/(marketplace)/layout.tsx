import type { ReactNode } from "react";

import { DomainLayout } from "@/components/migration/DomainLayout";

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return <DomainLayout domain="marketplace">{children}</DomainLayout>;
}
