import { cn } from "@/lib/utils";

/**
 * Hamarea wordmark (« HAMAREA — JUST RUN & SWIM »).
 * Rendered as a CSS mask so it inherits `currentColor` — ink on light
 * surfaces, white on the dark hero overlay/footer. Set the height via
 * className (e.g. `h-7`); width is derived from the logo's aspect ratio.
 */
export function Logo({
  className,
  title = "Hamarea — Just Run & Swim",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      role="img"
      aria-label={title}
      className={cn("brand-logo h-7 w-auto", className)}
    />
  );
}
