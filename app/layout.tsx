import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeeNaradha | తెలుగు Entertainment",
  description: "Telugu movies, news, OTT, videos and Movie Pulse.",
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="te"><body>{children}</body></html>;
}
