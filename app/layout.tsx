import type { ReactNode } from "react";
import Providers from "./components/Providers";

export const metadata = {
  title: "RSS Insight Analyst",
  description: "RSS 기반 시장 인사이트 제공 서비스",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-slate-50 text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
