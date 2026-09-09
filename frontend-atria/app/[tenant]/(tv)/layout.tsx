import { ProtectedRoute } from "@/components/auth/protected-route";

export default function TvLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
