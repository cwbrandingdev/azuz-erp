import { redirect } from "next/navigation";

export default async function ClientPortalAliasPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/portal/${token}`);
}
