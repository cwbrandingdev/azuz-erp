import Forms from "./components/forms";

export default function LeadsCentral() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--atria-primary)] sm:text-2xl">
          Central de Leads
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--atria-primary)]/50">
          Formulários enviados pelo site da CW, com contato, faturamento e a
          mensagem de cada lead.
        </p>
      </div>
      <Forms />
    </div>
  );
}
