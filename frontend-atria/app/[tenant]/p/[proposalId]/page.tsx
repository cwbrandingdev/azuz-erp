import { PublicProposalPageClient } from "@/components/proposals/public/public-proposal-page-client";

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  return <PublicProposalPageClient proposalId={proposalId} />;
}
