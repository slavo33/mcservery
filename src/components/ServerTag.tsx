import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Jednotný odznak (tag) pre celú aplikáciu — edícia (Java/Bedrock), proxy,
 * software/loader, verzia, VIP, stav atď.
 * Všetky tagy zdieľajú rovnaké písmo, veľkosti, rádiusy a rozostupy;
 * mení sa len farebný variant.
 */
export type ServerTagVariant =
  | "neutral"
  | "accent"
  | "primary"
  | "success"
  | "muted"
  | "vip-basic"
  | "vip-pro"
  | "vip-max";

export type ServerTagSize = "sm" | "md";

export const serverTagBase =
  "inline-flex items-center gap-1 rounded-md border font-body font-medium " +
  "whitespace-nowrap text-nowrap leading-none max-w-full";

export const serverTagSizes: Record<ServerTagSize, string> = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-1.5 py-0.5 text-xs sm:px-2.5 sm:py-1 sm:text-sm",
};

export const serverTagVariants: Record<ServerTagVariant, string> = {
  neutral: "bg-foreground/[0.08] text-foreground/80 border-foreground/10",
  accent: "bg-primary/15 text-primary border-primary/25",
  primary: "bg-primary/90 text-primary-foreground border-primary/50",
  success:
    "bg-[hsla(145,63%,42%,0.2)] text-[hsl(145_63%_55%)] border-[hsla(145,63%,42%,0.3)]",
  muted: "bg-muted text-muted-foreground border-border",
  "vip-basic":
    "bg-[hsla(210,100%,56%,0.2)] text-[hsl(210_100%_65%)] border-[hsla(210,100%,56%,0.3)]",
  "vip-pro":
    "bg-[hsla(270,70%,55%,0.2)] text-[hsl(270_70%_65%)] border-[hsla(270,70%,55%,0.3)]",
  "vip-max":
    "bg-[hsla(45,93%,47%,0.2)] text-[hsl(45_93%_55%)] border-[hsla(45,93%,47%,0.3)]",
};

export const serverTagClasses = (
  variant: ServerTagVariant = "neutral",
  size: ServerTagSize = "md",
  className?: string
) => cn(serverTagBase, serverTagSizes[size], serverTagVariants[variant], className);

export interface ServerTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ServerTagVariant;
  size?: ServerTagSize;
}

const ServerTag = forwardRef<HTMLSpanElement, ServerTagProps>(
  ({ variant = "neutral", size = "md", className, children, ...rest }, ref) => (
    <span ref={ref} data-server-tag={variant} className={serverTagClasses(variant, size, className)} {...rest}>
      {children}
    </span>
  )
);
ServerTag.displayName = "ServerTag";

export default ServerTag;
