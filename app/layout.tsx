import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema interno | Digital Amenities",
  description: "Gestión interna de proyectos, caja, costos e inversiones de Digital Amenities."
};

// El tema vive en localStorage y hasta ahora lo aplicaba un useEffect de
// AppFrame, o sea despues de hidratar: quien elegia modo claro se comia un
// flash oscuro en cada carga. Este script corre antes del primer pintado.
// Va inline a proposito; un import externo llegaria tarde.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem("da-theme");
    document.documentElement.dataset.theme = t === "light" ? "light" : "dark";
  } catch (e) {
    document.documentElement.dataset.theme = "dark";
  }
})();
`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
