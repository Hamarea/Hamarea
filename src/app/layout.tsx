import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Hamarea — Sacoches étanches, lunettes & casquettes",
    template: "%s — Hamarea",
  },
  description:
    "Sacoches étanches, lunettes et casquettes — pensés pour la mer, le vent, et tout ce qui suit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
