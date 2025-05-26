import type { Metadata } from "next";
import { lexend } from "@/app/ui/fonts";

export const metadata: Metadata = {
  title: "Open Connect",
  description: "Power your UCPEs with great management !",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/core@1.3.2/dist/css/tabler.min.css"
        />
      </head>
      <body className={`${lexend.className} antialiased`}>{children}</body>
    </html>
  );
}
