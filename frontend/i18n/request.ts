import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

// Supported locales
export const locales = ['pt-BR', 'en'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  // Get locale from cookie (set by language switcher)
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value;

  // Validate and use locale from cookie, fallback to pt-BR
  const locale =
    cookieLocale && locales.includes(cookieLocale as Locale)
      ? (cookieLocale as Locale)
      : 'pt-BR';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
