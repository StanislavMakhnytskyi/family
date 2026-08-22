import { logoutAdmin } from "@/app/admin/actions/auth";
import { setDataSource } from "@/app/admin/actions/data-source";
import { LogoMark } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  isGlobalConfigSourceAvailable,
  isLocalSourceAvailable,
} from "@/lib/admin-data";

export default function AdminSourcePickerPage() {
  const localAvailable = isLocalSourceAvailable();
  const globalConfigAvailable = isGlobalConfigSourceAvailable();

  return (
    <div className="mx-auto max-w-[640px] px-[18px] py-10">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark size={26} />
          <span className="font-serif text-lg font-medium text-ink">
            Адміністрування
          </span>
        </div>
        <form action={logoutAdmin}>
          <Button type="submit" variant="ghost" className="text-sm">
            Вийти
          </Button>
        </form>
      </header>

      <h1 className="mb-2 font-serif text-2xl text-ink">Джерело даних</h1>
      <p className="mb-6 text-[14.5px] text-muted">
        Оберіть, які дані редагувати цього разу.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col p-5">
          <h2 className="mb-2 font-serif text-lg text-ink">Локальні файли</h2>
          <p className="mb-4 flex-1 text-[13.5px] text-muted">
            src/data/*.json на диску. Працює лише в локальній розробці.
          </p>
          <form action={setDataSource}>
            <input type="hidden" name="source" value="local" />
            <Button type="submit" disabled={!localAvailable} className="w-full">
              Обрати
            </Button>
          </form>
          {!localAvailable && (
            <p className="mt-2 text-[12.5px] text-error">
              Недоступно на Vercel — файлова система там лише для читання.
            </p>
          )}
        </Card>

        <Card className="flex flex-col p-5">
          <h2 className="mb-2 font-serif text-lg text-ink">
            Vercel Global Config
          </h2>
          <p className="mb-4 flex-1 text-[13.5px] text-muted">
            Живі дані сайту. Зміни поширюються на прод протягом ~10 секунд.
          </p>
          <form action={setDataSource}>
            <input type="hidden" name="source" value="global-config" />
            <Button
              type="submit"
              disabled={!globalConfigAvailable}
              className="w-full"
            >
              Обрати
            </Button>
          </form>
          {!globalConfigAvailable && (
            <p className="mt-2 text-[12.5px] text-error">
              Задайте GLOBAL_CONFIG, VERCEL_API_TOKEN,
              VERCEL_GLOBAL_CONFIG_STORE_ID.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
