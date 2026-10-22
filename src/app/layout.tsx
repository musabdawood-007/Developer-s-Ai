import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PULSE — Your Emotional Compass. Steady Mind. Clear Path.",
  description:
    "PULSE is an AI companion for when you feel stuck, overwhelmed, or alone. Get immediate empathy, feel heard, and take one tiny step forward — no sign-up wall.",
  keywords: [
    "PULSE",
    "emotional support AI",
    "burnout",
    "stress relief",
    "motivation",
    "mental clarity",
    "AI companion",
  ],
  authors: [{ name: "Musab Dawood" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PULSE",
  },
  openGraph: {
    title: "PULSE — Your Emotional Compass",
    description:
      "Feeling heavy? Let's lighten the load together. PULSE listens first, then guides gently.",
    url: "https://musab-007.netlify.app",
    siteName: "PULSE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PULSE",
    description:
      "Your Emotional Compass. Steady Mind. Clear Path.",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1b26",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
