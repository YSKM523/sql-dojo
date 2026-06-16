import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import ProgressSync from "@/components/ProgressSync";
import { Topbar } from "@/components/Topbar";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SQL 道场 — 在浏览器里练真 SQL，从小白到 senior",
  description: "跑真实 Postgres、即时判对错、AI 结对的中文 SQL 实战学习平台。",
};

const themeScript =
  "try{var t=localStorage.getItem('sqldojo:theme')||'light';document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ProgressSync />
        <Topbar />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
