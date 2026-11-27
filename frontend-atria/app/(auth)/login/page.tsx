"use client";

import { AgencyLogo } from "@/components/branding/agency-logo";
import { LoginBrandShowcase } from "./components/LoginBrandShowcase";
import { LoginForm } from "./components/LoginForm";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <LoginBrandShowcase />

      <div className="relative flex min-h-svh flex-col overflow-hidden bg-[#f7fafa] dark:border-l dark:border-white/10 dark:bg-[#001a1a]">
        {/* No escuro, o lado do formulário usa o mesmo verde e dourado do painel ao lado. */}
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          style={{
            background:
              "radial-gradient(circle at 85% 8%, rgba(232,195,158,0.14) 0%, transparent 42%), radial-gradient(circle at 10% 95%, rgba(0,115,115,0.28) 0%, transparent 48%), linear-gradient(160deg, #002b2b 0%, #001a1a 55%, #001212 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 lg:hidden"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,73,73,0.08) 0%, transparent 28%)",
          }}
        />

        <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
              <AgencyLogo size="sm" variant="login" showName />
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
