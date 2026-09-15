import { PublicProposalPageClient } from "@/components/proposals/public/public-proposal-page-client";

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicProposalPageClient slug={slug} />;
}
