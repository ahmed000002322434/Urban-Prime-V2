import type { ReactNode } from "react";

import { DomainLayout } from "@/components/migration/DomainLayout";

export default function SocialLayout({ children }: { children: ReactNode }) {
  return <DomainLayout domain="social">{children}</DomainLayout>;
}
