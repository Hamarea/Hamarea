"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/lib/form-state";

/**
 * Server-action form with INLINE feedback. Wraps a `(prev, formData) => FormState`
 * action via useActionState and renders the returned error/success message inside
 * the form — instead of letting a thrown error escape to the error boundary
 * (full-page crash). `SubmitButton` (useFormStatus) inside keeps its pending state.
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
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state.error && (
        <p className="mt-1 text-sm text-[var(--color-danger)]">{state.error}</p>
      )}
      {state.ok && successMessage && (
        <p className="mt-1 text-sm text-[var(--color-secondary-700)]">
          {successMessage}
        </p>
      )}
    </form>
  );
}
