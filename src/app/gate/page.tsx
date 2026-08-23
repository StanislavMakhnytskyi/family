import { getTranslations } from "next-intl/server";

import { GateForm } from "@/components/client/GateForm";
import { LogoMark } from "@/components/SiteHeader";
import { getQuestions } from "@/lib/data";
import { pickRandomItem } from "@/lib/utils";
import { demoModeFlag } from "@/lib/flags";

export default async function GatePage() {
  const t = await getTranslations();
  const isDemo = await demoModeFlag();
  const questions = await getQuestions();
  const initialQuestion = pickRandomItem(questions);
  const questionOptions = questions.map(({ id, question }) => ({
    id,
    question,
  }));

  return (
    <div className="relative min-h-dvh">
      <div className="flex min-h-dvh items-center justify-center px-[18px] py-6 pb-10">
        <div className="w-full max-w-[440px] animate-fade-up">
          <div className="rounded-xl border border-border bg-surface px-7 pt-[34px] pb-7 shadow-login">
            <div className="flex flex-col items-center gap-2.5 text-center">
              <LogoMark size={34} />
              <h1 className="m-0 font-serif text-[30px] font-medium tracking-tight text-ink">
                {t("Gate.title")}
              </h1>
              <p className="m-0 max-w-[300px] text-[14.5px] leading-normal text-muted">
                {t("Gate.subtitle")}
              </p>
              {isDemo && (
                <p className="m-0 max-w-[300px] rounded-xs border border-border-divider bg-[#f7ede0] px-3 py-2 text-[13px] leading-normal text-muted-4">
                  {t("Gate.demoHint")}
                </p>
              )}
            </div>

            <div className="mt-[26px] -mx-7 mb-6 h-px bg-border-divider" />

            <GateForm
              questions={questionOptions}
              initialQuestionId={initialQuestion.id}
              messages={{
                answerPlaceholder: t("Gate.answerPlaceholder"),
                submit: t("Gate.submit"),
                submitting: t("Gate.submitting"),
                otherQuestion: t("Gate.otherQuestion"),
                errorEmpty: t("Gate.errorEmpty"),
                errorWrong: t("Gate.errorWrong"),
                lockedPrefix: t("Gate.lockedPrefix"),
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
