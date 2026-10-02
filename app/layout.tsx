import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "URBAN SALON & STUDIO - Цаг захиалга",
  description: "Мэргэжлийн шилдэг үсчдийн цаг захиалгын систем",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body className="bg-neutral-950 text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}