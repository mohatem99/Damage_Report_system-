import { cn } from "@/lib/utils";

/**
 * The ContainerCare logo mark: a stylised shipping container (corrugated box).
 * Drawn with `currentColor` so it inherits the text colour of its container —
 * place it on the primary square in the nav/login and it renders in the
 * primary-foreground colour. Size it via the `className` (default 60% of box).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-[60%]", className)}
    >
      {/* container body */}
      <rect x="3" y="7" width="18" height="10" rx="1.2" />
      {/* corrugation ribs */}
      <path d="M7 7.5v9M11 7.5v9M15 7.5v9M18 7.5v9" />
    </svg>
  );
}
