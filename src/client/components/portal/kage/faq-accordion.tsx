import type { ReactNode } from 'react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

// Tanya-jawab bergaya kage: kartu membulat per pertanyaan dengan tanda +/− bundar.
// Memakai Radix Accordion langsung (bukan pembungkus shadcn) karena pemicu dan ikonnya
// berbeda sama sekali; perilaku keyboard dan aria tetap dari Radix.

export type FaqItem = { question: string; answer: ReactNode }

export function FaqAccordion({
  items,
  defaultOpen = 0,
  className,
}: {
  items: FaqItem[]
  // Indeks pertanyaan yang terbuka saat dimuat; null bila semua tertutup.
  defaultOpen?: number | null
  className?: string
}) {
  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      defaultValue={defaultOpen === null ? undefined : `faq-${defaultOpen}`}
      className={cn('grid gap-3', className)}
    >
      {items.map((item, index) => (
        <AccordionPrimitive.Item
          key={item.question}
          value={`faq-${index}`}
          className="group rounded-2xl border border-site-rule bg-site-canvas transition-colors hover:border-site-ink data-[state=open]:hover:border-site-rule"
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="flex w-full items-center justify-between gap-4 rounded-2xl p-5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring md:p-6">
              <span className="font-site-display text-base font-bold text-site-ink md:text-lg">
                {item.question}
              </span>
              <span
                aria-hidden="true"
                className="flex size-8 flex-none items-center justify-center rounded-full border border-site-rule bg-site-paper font-site-mono text-sm text-site-ink transition-colors group-data-[state=open]:border-site-ink group-data-[state=open]:bg-site-ink group-data-[state=open]:text-site-canvas"
              >
                <span className="group-data-[state=open]:hidden">+</span>
                <span className="hidden group-data-[state=open]:inline">−</span>
              </span>
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down motion-reduce:animate-none">
            <div className="mx-5 border-t border-site-rule pt-4 pb-5 font-site-body text-base leading-relaxed text-site-muted md:mx-6 md:pb-6">
              {item.answer}
            </div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  )
}
