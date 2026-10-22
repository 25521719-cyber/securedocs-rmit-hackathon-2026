import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureDocs | RMIT Hackathon",
  description: "SecureDocs public demonstration workspace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
