import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 商品图展示设计生成器",
  description: "上传商品图，选择平台和风格，AI 自动生成电商展示设计图方案",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
