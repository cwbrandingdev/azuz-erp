"use client";

import { useEffect } from "react";
import { useCompany } from "@/contexts/company-context";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { company, branding } = useCompany();

  useEffect(() => {
    if (company?.name || branding.agencyName) {
      const name = company?.name || branding.agencyName;
      document.title = `${name} | Login`;
      return;
    }

    document.title = "ATRIA ERP";
  }, [company?.name, branding.agencyName]);

  return <>{children}</>;
}
