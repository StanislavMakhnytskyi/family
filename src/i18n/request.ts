import { getRequestConfig } from "next-intl/server";
import { demoModeFlag } from "@/lib/flags";

export default getRequestConfig(async () => {
  const locale = (await demoModeFlag()) ? "en" : "uk";
  const messages = (await import(`../../messages/${locale}.json`)).default;

  return { locale, messages };
});
