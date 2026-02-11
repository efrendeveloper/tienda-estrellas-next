import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press",
});

export const metadata: Metadata = {
  title: "Efrendrums - Tienda Estrellas",
  description: "Gestión de alumnos y tienda de estrellas Efrendrums",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={pressStart.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-press antialiased" style={{ fontFamily: "'Press Start 2P', cursive" }}>
        {children}
      </body>
    </html>
  );
}
