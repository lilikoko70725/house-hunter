import "./globals.css";

import Navbar from "./components/Navbar";

export const metadata = {
  title: "House Hunter - 智慧房屋分析與看房規劃",
  description: "AI 驅動的房屋優缺點分析與看房行程規劃工具。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
