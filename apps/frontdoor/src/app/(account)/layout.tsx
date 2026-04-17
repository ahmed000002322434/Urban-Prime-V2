import type { ReactNode } from "react";

import { DomainLayout } from "@/components/migration/DomainLayout";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <DomainLayout domain="account">{children}</DomainLayout>;
}
