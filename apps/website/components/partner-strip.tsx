import { LogoMark } from "@truelend/ui";
import { banks } from "@/content/banks";

export function PartnerStrip() {
  const names = [...banks.map((b) => b.name), "and many more"];
  return (
    <section aria-label="Lenders we compare across" className="border-y border-hairline bg-white">
      <p className="pt-8 text-center text-xs font-bold uppercase tracking-[0.18em] text-muted">
        Lenders we compare across
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-6">
        {names.map((name) => (
          <li key={name} className="flex items-center gap-3 font-display font-semibold text-muted">
            {name}
            <LogoMark className="h-3.5 w-3.5 text-navy-500" aria-hidden />
          </li>
        ))}
      </ul>
    </section>
  );
}
