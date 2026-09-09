import { TenantProvider } from "@/contexts/tenant-context";
import { APEX_TENANT_SEGMENT } from "@/lib/tenancy/tenant-host";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  const slug = tenant === APEX_TENANT_SEGMENT ? null : tenant;

  return <TenantProvider slug={slug}>{children}</TenantProvider>;
}
