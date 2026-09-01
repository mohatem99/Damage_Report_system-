import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import "../globals.css";
import { Providers } from "../providers";
import { AppShell } from "@/components/app-shell";
import { routing, LOCALE_DIR, type AppLocale } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "ContainerCare — Damage & Repair Estimates",
  description: "ContainerCare — container damage inspection and repair estimate system",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // A path like /fr with no matching locale renders the 404 page.
  if (!hasLocale(routing.locales, locale)) notFound();

  // Opt into static rendering for this locale (required with next-intl).
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={LOCALE_DIR[locale as AppLocale]}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
