"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
          Une erreur critique est survenue
        </h1>
        <p style={{ color: "#6b7280", maxWidth: "28rem" }}>
          L&apos;application a rencontré un problème inattendu.
        </p>
        <button
          onClick={reset}
          style={{
            borderRadius: "0.375rem",
            background: "#1e3a5f",
            color: "white",
            padding: "0.5rem 1.25rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
