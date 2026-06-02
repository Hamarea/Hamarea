"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button wired to the parent <form>'s pending state (useFormStatus).
 * Drop-in replacement for <Button type="submit"> inside server-action forms:
 * shows a spinner and disables itself while the action runs — the loading
 * feedback that plain server-action forms otherwise lack.
 */
export function SubmitButton({ children, disabled, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </Button>
  );
}
