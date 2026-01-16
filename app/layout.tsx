import type { ReactNode } from "react";
import Providers from "./components/Providers";
import "./globals.css";

export const metadata = {
  title: "RSS Insight Analyst",
  description: "RSS 기반 시장 인사이트 제공 서비스",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
