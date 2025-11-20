import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "./components/Header";
import { SiteFooter } from "./components/SiteFooter";
import { SessionProvider } from "./components/SessionProvider";


const geistSans = localFont({
  src: "./fonts/Geist.ttf",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const tapestry = localFont({
  src: "./fonts/Tapestry.ttf",
  variable: "--font-tapestry",
  weight: "400",
});

export const metadata: Metadata = {
  title: "sayahat ",
  description: "Alimzhan Zhorabek",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
          className={`${geistSans.variable} ${geistMono.variable} ${tapestry.variable} font-sans antialiased`}
        >
        <SessionProvider>
        <Navbar />
        {children}
        <SiteFooter />
        </SessionProvider>
      </body>
    </html>
  );
}