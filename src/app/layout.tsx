import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import ToastProvider from "@/components/ToastProvider";
import { getCurrentUser } from "@/lib/auth";
import { initDb } from "@/lib/db";

const nunito = Nunito({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

initDb();

export const metadata: Metadata = {
  title: "Family Events",
  description: "Coordinate and celebrate family moments together",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const userProp = user ? { displayName: user.displayName, role: user.role } : null;

  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="h-dvh flex flex-col">
        <ToastProvider>
          <NavBar user={userProp} />
          <main className="flex-1 min-h-0 flex flex-col max-w-5xl mx-auto w-full px-4 py-8 overflow-y-auto">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
