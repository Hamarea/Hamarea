"use client";

import { useEffect, useRef } from "react";

/**
 * Warns before leaving (refresh/close/external nav) when the surrounding <form>
 * has unsaved edits. Drop inside an ActionForm; resets on submit. Covers the
 * native beforeunload path (client-side Link nav is not intercepted here).
 */
export function UnsavedGuard() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    let dirty = false;
    const markDirty = () => {
      dirty = true;
    };
    const clear = () => {
      dirty = false;
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    form.addEventListener("submit", clear);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
      form.removeEventListener("submit", clear);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);
  return <span ref={ref} hidden aria-hidden />;
}
