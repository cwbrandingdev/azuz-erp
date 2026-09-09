import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";

const proposalSerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-proposal-serif",
});

export const metadata: Metadata = {
  title: "Proposta Comercial | CWBranding",
  description: "Proposta comercial CWBranding",
};

export default function PublicProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${proposalSerif.variable} min-h-screen bg-white antialiased`}
    >
      {children}
    </div>
  );
}
