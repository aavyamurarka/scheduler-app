import type { Metadata } from "next";
import { DM_Sans, Fraunces, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Scheduler',
  description: 'Auto-schedule your day around fixed commitments',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Scheduler',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="shell h-full min-h-0 overflow-hidden flex flex-col">
        {oneSignalAppId ? (
          <Script
            src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
            strategy="afterInteractive"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
