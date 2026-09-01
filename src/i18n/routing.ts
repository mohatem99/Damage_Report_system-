import { defineRouting } from "next-intl/routing";

/** App locales. English is the default; Arabic (ar) renders right-to-left. */
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
});

export type AppLocale = (typeof routing.locales)[number];

/** Text direction per locale — drives <html dir> and RTL-aware styling. */
export const LOCALE_DIR: Record<AppLocale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

/** Human labels for the language switcher. */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  ar: "العربية",
};
