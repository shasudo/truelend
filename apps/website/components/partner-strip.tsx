import { LogoMark } from "@truelend/ui";
import { banks } from "@/content/banks";

/** Typographic marquee of partner lenders (no licensed logo assets yet — todo.md). */
export function PartnerStrip() {
  const names = [...banks.map((b) => b.name), "and many more"];
  return (
    <section aria-label="Lenders we compare across" className="border-y border-hairline bg-white">
      <p className="pt-8 text-center text-xs font-bold uppercase tracking-[0.18em] text-navy-400">
        Lenders we compare across
      </p>
      <div className="relative overflow-hidden py-6 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-[marquee_45s_linear_infinite] motion-reduce:animate-none">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
              {names.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-8 pr-8 font-display text-lg font-semibold text-navy-400"
                >
                  {name}
                  <LogoMark className="h-3.5 w-3.5 text-navy-200" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
