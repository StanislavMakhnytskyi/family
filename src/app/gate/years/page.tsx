import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { YearsGateForm } from "@/components/client/YearsGateForm";
import { LogoMark } from "@/components/SiteHeader";
import { hasPassedStageOne } from "@/lib/session";

export default async function GateYearsPage() {
  if (!(await hasPassedStageOne())) {
    redirect("/gate");
  }

  const t = await getTranslations();

  return (
    <div className="relative min-h-dvh">
      <div className="flex min-h-dvh items-center justify-center px-[18px] py-6 pb-10">
        <div className="w-full max-w-[440px] animate-fade-up">
          <div className="rounded-xl border border-border bg-surface px-7 pt-[34px] pb-7 shadow-login">
            <div className="flex flex-col items-center gap-2.5 text-center">
              <LogoMark size={34} />
              <h1 className="m-0 font-serif text-[30px] font-medium tracking-tight text-ink">
                {t("GateYears.title")}
              </h1>
              <p className="m-0 max-w-[300px] text-[14.5px] leading-normal text-muted">
                {t("GateYears.subtitle")}
              </p>
            </div>

            <div className="mt-[26px] -mx-7 mb-6 h-px bg-border-divider" />

            <YearsGateForm
              messages={{
                yearPlaceholder: t("GateYears.yearPlaceholder"),
                submit: t("GateYears.submit"),
                submitting: t("GateYears.submitting"),
                errorIncomplete: t("GateYears.errorIncomplete"),
                errorWrong: t("GateYears.errorWrong"),
                lockedPrefix: t("GateYears.lockedPrefix"),
              }}
            />
          </div>

          <p className="mt-[18px] px-0.5 text-center text-[12.5px] text-faint">
            {t("Common.footerNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
