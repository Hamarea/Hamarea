import Link from "next/link";

// Root not-found: catches requests that never reach the `[locale]` segment —
// e.g. browser probes for dotted paths (`/favicon.ico`, `/apple-touch-icon.png`)
// and any other unmatched path. These bypass the i18n middleware, so without a
// root not-found Next failed to render them and returned a 500 instead of a 404.
// The root layout is a pass-through with no <html>, so this renders a
// self-contained document with inline styles (no i18n context, no globals
// dependency). Plain `next/link` keeps it free of the next-intl provider.
export default function RootNotFound() {
  return (
    <html lang="fr">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, 'Times New Roman', serif",
          gap: "0.75rem",
          padding: "2rem",
          textAlign: "center",
          background: "#fbfaf7",
          color: "#0e2a3a",
        }}
      >
        <p style={{ fontSize: "3.5rem", fontWeight: 700, margin: 0 }}>404</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          Page introuvable
        </h1>
        <p
          style={{
            color: "#6b7280",
            maxWidth: "28rem",
            fontFamily: "system-ui, sans-serif",
            margin: 0,
          }}
        >
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          style={{
            marginTop: "0.75rem",
            borderRadius: "0.375rem",
            background: "#0e2a3a",
            color: "white",
            padding: "0.6rem 1.4rem",
            textDecoration: "none",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          Retour à l&apos;accueil
        </Link>
      </body>
    </html>
  );
}
