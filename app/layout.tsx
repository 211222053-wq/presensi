import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Facial Attendance",
  description: "Vercel-ready smart attendance scanner and reporting dashboard.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-grid text-slate-100 antialiased">
        <header className="border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-cyan-300">
              PRESENSI // CCTV
            </Link>
            <Link href="/dashboard" className="rounded border border-cyan-500/40 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-500/10">
              Dashboard
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</main>
      </body>
    </html>
  );
}
