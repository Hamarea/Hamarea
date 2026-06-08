"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { FormState } from "@/lib/form-state";

/**
 * Server-action form with feedback. Wraps a `(prev, formData) => FormState` action
 * via useActionState. On success it fires a transient toast (sonner); errors stay
 * INLINE near the form so they persist and don't escape to the error boundary.
 * `SubmitButton` (useFormStatus) inside keeps its pending state.
 */
export function ActionForm({
  action,
  children,
  className,
  successMessage,
  resetOnSuccess = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(successMessage ?? "Enregistré.");
      if (resetOnSuccess) ref.current?.reset();
    }
  }, [state, successMessage, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state.error && (
        <p className="mt-1 text-sm text-[var(--color-danger)]">{state.error}</p>
      )}
    </form>
  );
}
