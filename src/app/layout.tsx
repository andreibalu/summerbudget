
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const APP_NAME = "Summer Budget";
const APP_DESCRIPTION = "Interactive budget planner for the summer.";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  // manifest: "/manifest.json", // Next.js 14+ handles this automatically if manifest.json is in /public
};

const svgIconDataUri = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='180'%20height='180'%20viewBox='0%200%20100%20100'%3E%3Crect%20width='100'%20height='100'%20fill='%23E5F0E7'/%3E%3Cpath%20d='M50,15%20C25,30%2030,80%2050,85%20C70,80%2075,30%2050,15%20Z'%20fill='%23A0D6B4'/%3E%3Cpath%20d='M50,15%20C50,35%2045,55%2050,85'%20stroke='%23FFFFFF'%20stroke-width='3'%20fill='none'%20opacity='0.4'/%3E%3C/svg%3E";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content={APP_NAME} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={APP_NAME} />
        <meta name="description" content={APP_DESCRIPTION} />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#A0D6B4" /> {/* Corresponds to primary color */}
        
        <link rel="apple-touch-icon" href={svgIconDataUri} />
        {/* You can add more specific sizes for apple-touch-icon if you have them, e.g.: */}
        {/* <link rel="apple-touch-icon" sizes="152x152" href="/icons/touch-icon-ipad.png" /> */}
        {/* <link rel="apple-touch-icon" sizes="180x180" href="/icons/touch-icon-iphone-retina.png" /> */}
        {/* <link rel="apple-touch-icon" sizes="167x167" href="/icons/touch-icon-ipad-retina.png" /> */}
        
        {/* <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" /> */}
        {/* <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" /> */}
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
