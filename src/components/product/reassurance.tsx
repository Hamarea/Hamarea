import { ShieldCheck, Truck, RotateCcw, Lock } from "lucide-react";
import { getProductCopy } from "@/lib/product-content";

/** Trust microcopy row, placed under primary CTAs. */
export function Reassurance({ dark = false, locale }: { dark?: boolean; locale: string }) {
  const tone = dark ? "text-white/80" : "text-[var(--color-muted)]";
  const r = getProductCopy(locale).reassurance;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ${tone}`}>
      <span className="inline-flex items-center gap-1">
        <Truck className="h-3.5 w-3.5" /> {r.freeShip}
      </span>
      <span className="inline-flex items-center gap-1">
        <RotateCcw className="h-3.5 w-3.5" /> {r.returns}
      </span>
      <span className="inline-flex items-center gap-1">
        <ShieldCheck className="h-3.5 w-3.5" /> {r.warranty}
      </span>
      <span className="inline-flex items-center gap-1">
        <Lock className="h-3.5 w-3.5" /> {r.securePay}
      </span>
    </div>
  );
}

const MARKS = ["Visa", "Mastercard", "Apple Pay", "G Pay", "Klarna"];

/** Accepted payment marks as labelled pills (avoids trademark logo misuse). */
export function PaymentMarks({ dark = false }: { dark?: boolean }) {
  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {MARKS.map((m) => (
        <li
          key={m}
          className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ring-1 ${
            dark
              ? "text-white/85 ring-white/25"
              : "text-[var(--color-muted)] ring-[var(--color-border)]"
          }`}
        >
          {m}
        </li>
      ))}
    </ul>
  );
}
