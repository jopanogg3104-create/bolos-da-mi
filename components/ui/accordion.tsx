"use client";
import * as React from "react";
import * as Primitive from "@radix-ui/react-accordion";
// Accessible ShadCN/Radix composition with brand-specific styles.
export const Accordion = Primitive.Root;
export function AccordionItem({ className = "", ...props }: React.ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item data-slot="accordion-item" className={`faq-item ${className}`} {...props} />;
}
export function AccordionTrigger({ children, className = "", ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Header><Primitive.Trigger data-slot="accordion-trigger" className={`faq-trigger ${className}`} {...props}>{children}<span className="faq-indicator" aria-hidden="true">+</span></Primitive.Trigger></Primitive.Header>;
}
export function AccordionContent({ children, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Content data-slot="accordion-content" className="faq-answer" {...props}><p>{children}</p></Primitive.Content>;
}
