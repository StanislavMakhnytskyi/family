import type { Metadata } from "next";
import { Literata, Nunito_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import "./globals.css";

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Родинна історія",
  description: "Приватний сімейний архів",
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const messages = await getMessages();

  return (
    <html
      lang="uk"
      className={`${literata.variable} ${nunitoSans.variable} h-full`}
    >
      <body className="min-h-full font-sans antialiased">
        <div className="paper-texture pointer-events-none fixed inset-0 z-[60] opacity-50" />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
