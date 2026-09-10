import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PROTOCOL — e스포츠 매니저",
  description: "훈련, 밴픽, 전략과 시즌 운영. 나만의 e스포츠 팀을 정상으로.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {capable: true, statusBarStyle: "black-translucent", title: "PROTOCOL"},
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
