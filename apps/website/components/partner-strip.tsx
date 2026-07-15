import { LogoMark } from "@truelend/ui";
import { banks } from "@/content/banks";

export function PartnerStrip() {
  const names = [...banks.map((b) => b.name), "and many more"];
  return (
    <section
      aria-label="Lenders we compare across"
      className="border-y border-hairline bg-white py-5"
    >
      <div className="mx-auto flex w-full max-w-[95rem] flex-col gap-5 px-5 sm:px-8 lg:flex-row lg:items-center">
        <p className="shrink-0 border-b border-red-600 pb-3 text-xs font-bold uppercase leading-relaxed tracking-[0.12em] text-navy-800 lg:w-52 lg:border-r lg:border-b-0 lg:pb-0 lg:pr-6">
          Access to multiple leading banks & NBFCs
        </p>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-between lg:gap-x-4">
          {names.map((name) => (
            <li
              key={name}
              className="flex items-center gap-2 whitespace-nowrap font-display text-sm font-bold text-navy-600"
            >
              <LogoMark className="h-4 w-4 text-navy-500" aria-hidden />
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
