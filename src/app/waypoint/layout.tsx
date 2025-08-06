import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Waypoint - Test Page',
    description: 'Private experimental page',
    robots: 'noindex, nofollow',
};

export default function WaypointLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={inter.variable}>
            <head>
                <meta name="robots" content="noindex, nofollow" />
            </head>
            <body className={`${inter.variable} antialiased`}>
                {children}
            </body>
        </html>
    );
} 