import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const r28 = cva(
  "inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] transition-all duration-500 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  {
    variants: {
      variant: {
        door: "bg-primary text-primary-foreground px-8 py-4 hover:glow hover:bg-glow",
        ghost: "border border-border text-foreground px-8 py-4 hover:border-primary hover:text-primary",
        quiet: "text-muted-foreground px-2 py-2 hover:text-primary",
        choice: "w-full justify-start text-left normal-case tracking-normal font-normal text-base border border-border bg-card/60 px-5 py-4 hover:border-primary hover:bg-accent",
      },
    },
    defaultVariants: { variant: "door" },
  },
);

export function R28Button({ className, variant, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof r28>) {
  return <button className={cn(r28({ variant }), className)} {...p} />;
}
