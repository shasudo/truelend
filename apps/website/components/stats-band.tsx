import { Container, Stat } from "@truelend/ui";

// Figures are launch placeholders — sourced from TrueLend before go-live (todo.md).
const stats = [
  { value: "10,000+", label: "Borrowers guided so far" },
  { value: "50+", label: "Banks & NBFCs, pan India" },
  { value: "100%", label: "Transparent & confidential" },
  { value: "₹0", label: "Fees charged to borrowers", accent: true },
];

export function StatsBand() {
  return (
    <section className="bg-navy-950 text-white">
      <Container className="grid grid-cols-2 gap-y-10 py-12 sm:py-14 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Stat
            key={s.value}
            {...s}
            className={i > 0 ? "lg:border-l lg:border-white/10 lg:pl-8" : undefined}
          />
        ))}
      </Container>
    </section>
  );
}
