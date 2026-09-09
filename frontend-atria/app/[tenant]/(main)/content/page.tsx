import { redirect } from "next/navigation";

type ContentRedirectPageProps = {
  searchParams: Promise<{
    clientId?: string;
    create?: string;
  }>;
};

export default async function ContentRedirectPage({
  searchParams,
}: ContentRedirectPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (params.clientId) query.set("clientId", params.clientId);
  if (params.create) query.set("create", params.create);

  redirect(`/creation${query.size ? `?${query.toString()}` : ""}`);
}
