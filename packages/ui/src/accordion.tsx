"use client";

import { Accordion as RadixAccordion } from "radix-ui";
import { Plus } from "lucide-react";
import { cx } from "./cx";

export interface AccordionProps {
  items: { q: string; a: string }[];
  className?: string;
}

export function Accordion({ items, className }: AccordionProps) {
  return (
    <RadixAccordion.Root
      type="single"
      collapsible
      className={cx("divide-y divide-hairline border-y border-hairline", className)}
    >
      {items.map((item, i) => (
        <RadixAccordion.Item key={i} value={`item-${i}`}>
          <RadixAccordion.Header>
            <RadixAccordion.Trigger className="group flex w-full items-center justify-between gap-4 py-5 text-left font-medium text-navy-950 transition-colors hover:text-navy-700">
              {item.q}
              <Plus
                aria-hidden
                className="h-4 w-4 shrink-0 text-red-600 transition-transform duration-200 group-data-[state=open]:rotate-45"
              />
            </RadixAccordion.Trigger>
          </RadixAccordion.Header>
          <RadixAccordion.Content className="overflow-hidden data-[state=closed]:animate-[accordion-up_200ms_var(--ease-out-quart)] data-[state=open]:animate-[accordion-down_200ms_var(--ease-out-quart)]">
            <p className="pb-5 pr-8 leading-relaxed text-navy-600">{item.a}</p>
          </RadixAccordion.Content>
        </RadixAccordion.Item>
      ))}
    </RadixAccordion.Root>
  );
}
