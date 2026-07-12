import type { ReactNode } from "react";
import { Container, HexPattern, SectionHeading } from "@truelend/ui";

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}

export function PageHeader({ eyebrow, title, lede, children }: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden border-b border-hairline">
      <HexPattern className="-right-32 -top-40 h-[420px] w-[420px] text-navy-800/[0.06]" />
      <Container className="py-16 sm:py-20">
        <SectionHeading eyebrow={eyebrow} title={title} lede={lede} />
        {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
      </Container>
    </section>
  );
}
