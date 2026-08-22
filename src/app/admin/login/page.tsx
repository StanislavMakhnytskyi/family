import { AdminLoginForm } from "@/components/client/AdminLoginForm";
import { LogoMark } from "@/components/SiteHeader";

export default function AdminLoginPage() {
  return (
    <div className="relative min-h-dvh">
      <div className="flex min-h-dvh items-center justify-center px-[18px] py-6 pb-10">
        <div className="w-full max-w-[380px] animate-fade-up">
          <div className="rounded-xl border border-border bg-surface px-7 pt-[34px] pb-7 shadow-login">
            <div className="flex flex-col items-center gap-2.5 text-center">
              <LogoMark size={34} />
              <h1 className="m-0 font-serif text-[26px] font-medium tracking-tight text-ink">
                Адміністрування
              </h1>
              <p className="m-0 max-w-[280px] text-[14.5px] leading-normal text-muted">
                Увійдіть, щоб редагувати дані архіву
              </p>
            </div>

            <div className="mt-[26px] -mx-7 mb-6 h-px bg-border-divider" />

            <AdminLoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
