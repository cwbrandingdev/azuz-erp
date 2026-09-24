import { FinanceTutorialProvider } from "@/components/financial/finance-tutorial-provider";

export default function FinancialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FinanceTutorialProvider>{children}</FinanceTutorialProvider>;
}
