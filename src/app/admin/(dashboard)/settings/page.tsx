import { redirect } from "next/navigation";

import { AdminSettingsForm } from "@/components/client/AdminSettingsForm";
import { DataErrorCard } from "@/components/admin/DataErrorCard";
import { getSelectedDataSource, readDataSafe } from "@/lib/admin-data";

export default async function AdminSettingsPage() {
  const source = await getSelectedDataSource();
  if (!source) redirect("/admin");

  const result = await readDataSafe(source);
  if (!result.success) {
    return <DataErrorCard message={result.error} retryHref="/admin/settings" />;
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-2xl text-ink">Налаштування</h1>
        <p className="mt-1 text-small text-muted">Вони впливають на те, як родина бачить архів.</p>
      </div>
      <AdminSettingsForm showFullDates={result.data.settings.showFullDates} />
    </div>
  );
}
