"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-label="Language"
      >
        <Globe className="h-5 w-5" />
      </Button>
      {open && (
        <ul className="absolute right-0 mt-2 w-32 overflow-hidden rounded-md border border-[var(--color-border)] bg-white shadow-lg">
          {routing.locales.map((l) => (
            <li key={l}>
              <button
                onClick={() => {
                  router.replace(pathname, { locale: l });
                  setOpen(false);
                }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-primary-50)] ${
                  l === locale ? "font-semibold text-[var(--color-primary-700)]" : ""
                }`}
              >
                {l.toUpperCase()}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
