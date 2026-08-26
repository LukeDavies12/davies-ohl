import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Oh Hell! Leaderboard",
  description: "Davies Oh Hell! game log.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen max-w-full">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
