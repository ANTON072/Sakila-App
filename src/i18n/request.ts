import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  // TODO: あとで言語切替の機能を作る
  const locale = "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
