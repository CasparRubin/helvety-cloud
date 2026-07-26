import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helvety Cloud",
  description: "E2EE workspace on helvety.cloud",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
