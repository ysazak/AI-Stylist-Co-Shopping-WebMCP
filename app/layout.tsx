import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Make This Look Mine",
  description: "A shared AI stylist co-shopping workspace",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
