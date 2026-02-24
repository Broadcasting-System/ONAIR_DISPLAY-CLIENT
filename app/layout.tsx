import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ONAIR Display",
  description: "BSSM Broadcast Remote Control - Display Client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
