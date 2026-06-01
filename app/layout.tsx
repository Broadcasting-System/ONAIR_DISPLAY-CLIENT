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
      {/* 브라우저 확장이 body에 주입하는 속성으로 인한 hydration 경고 억제 */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
