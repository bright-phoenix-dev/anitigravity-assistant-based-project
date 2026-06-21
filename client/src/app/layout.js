import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayout from './ClientLayout';
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
export const metadata = {
  title: 'CarbonWise — Track & Reduce Your Carbon Footprint',
  description: 'Understand, track, and reduce your carbon footprint with AI-powered personalized insights. Log activities, build eco-friendly habits, and see your impact in real-time.',
  keywords: 'carbon footprint, sustainability, eco-friendly, carbon tracker, emissions, climate action',
};
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0f1a" />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
RootLayout.displayName = "RootLayout";
