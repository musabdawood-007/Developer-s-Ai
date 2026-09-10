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
  title: "Developer's Ai — Chat & Coding Tips by Musab Dawood",
  description:
    "Developer's Ai is a friendly chatbot built by Musab Dawood. Have a casual chat, get practical coding tips, or generate downloadable Markdown files on the fly.",
  keywords: [
    "Developer's Ai",
    "Musab Dawood",
    "chatbot",
    "coding tips",
    "markdown generator",
    "developer assistant",
    "Next.js chatbot",
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
    title: "Developer's Ai",
  },
  openGraph: {
    title: "Developer's Ai — Chat & Coding Tips",
    description:
      "A friendly chatbot by Musab Dawood. Chat casually, get coding tips, or generate Markdown files.",
    url: "https://musab-007.netlify.app",
    siteName: "Developer's Ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Developer's Ai",
    description:
      "A friendly chatbot by Musab Dawood. Chat casually, get coding tips, or generate Markdown files.",
  },
};

export const viewport: Viewport = {
  themeColor: "#c41e3a",
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
