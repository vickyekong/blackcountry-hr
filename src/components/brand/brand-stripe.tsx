import { cn } from "@/lib/cn";

/** Blackcountry corporate bar: signal yellow, land, sky, earth. */
export function BrandStripe({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex h-1 w-full overflow-hidden", className)}
      aria-hidden
    >
      <span className="flex-1 bg-lagoon" />
      <span className="flex-1 bg-ok" />
      <span className="flex-1 bg-sky" />
      <span className="flex-1 bg-signal" />
    </div>
  );
}
