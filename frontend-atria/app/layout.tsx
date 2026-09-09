import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { AuthProvider } from "@/contexts/auth-context";
import { AppearanceProvider } from "@/contexts/appearance-context";
import { BrandingProvider } from "@/contexts/branding-context";
import { ConfirmProvider } from "@/contexts/confirm-context";
import { QueryProvider } from "@/contexts/query-provider";
import { CompanyProvider } from "@/contexts/company-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { AppBootGate } from "@/components/layout/app-boot-gate";
import { Toaster } from "@/components/ui/sonner";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme-utils";
import { PUBLIC_SURFACE_HEADER } from "@/lib/tenancy/tenant-host";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ATRIA ERP",
  description: "Sistema de gestão AZUZ",
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ATRIA ERP",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const skipBootGate = headerStore.get(PUBLIC_SURFACE_HEADER) === "1";

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${inter.className} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="atria-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <CompanyProvider>
            <BrandingProvider>
              <AuthProvider>
                <QueryProvider>
                  <AppearanceProvider>
                    <ConfirmProvider>
                      <AppBootGate skip={skipBootGate}>{children}</AppBootGate>
                      <Toaster />
                    </ConfirmProvider>
                  </AppearanceProvider>
                </QueryProvider>
              </AuthProvider>
            </BrandingProvider>
          </CompanyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
