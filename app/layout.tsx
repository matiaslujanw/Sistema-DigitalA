import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema interno | Digital Amenities",
  description: "Gestión interna de proyectos, caja, costos e inversiones de Digital Amenities."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
