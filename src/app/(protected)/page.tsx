import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations();
  return <div>ダッシュボード: {t("meta.title")}</div>;
}
