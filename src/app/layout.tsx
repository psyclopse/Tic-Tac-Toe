import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Tic Tac Toe — Online Multiplayer",
  description:
    "Play real-time multiplayer Tic-Tac-Toe with friends. Create a room, share the code, and start playing instantly.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Tic Tac Toe — Online Multiplayer",
    description: "Real-time multiplayer Tic-Tac-Toe powered by Supabase.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased text-slate-100">{children}</body>
    </html>
  );
}
