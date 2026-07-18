import { LogoMark } from "@truelend/ui";

const lenderTypes = ["Leading Banks", "NBFCs", "Fintech Lenders"];

export function PartnerStrip() {
  return (
    <section
      aria-label="Lenders we compare across"
      className="border-y border-hairline bg-white py-5"
    >
      <div className="mx-auto flex w-full max-w-[95rem] flex-col gap-5 px-5 sm:px-8 lg:flex-row lg:items-center">
        <p className="shrink-0 border-b border-red-600 pb-3 text-xs font-bold uppercase leading-relaxed tracking-[0.12em] text-navy-800 lg:w-52 lg:border-r lg:border-b-0 lg:pb-0 lg:pr-6">
          We compare lending policies across
        </p>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {lenderTypes.map((type) => (
            <li
              key={type}
              className="flex items-center gap-2 whitespace-nowrap font-display text-base font-bold text-navy-800"
            >
              <LogoMark className="h-4 w-4 text-red-600" aria-hidden />
              {type}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
