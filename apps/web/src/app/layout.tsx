import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskTrail",
  description: "Field operations dashboard for service teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
