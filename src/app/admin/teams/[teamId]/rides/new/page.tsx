import GuidedTour, { type GuidedTourStep } from "@/app/_components/GuidedTour";
import { Car } from "lucide-react";
import { Suspense } from "react";
import RideForm from "../_components/RideForm";

const newRideGuideSteps = [
  {
    target: "admin-new-ride-basic",
    title: "配車予定を入力します",
    body: "日付、行き先、集合場所を入力します。集合場所まで入れておくと、LINE共有文にも反映されます。",
  },
  {
    target: "admin-new-ride-submit",
    title: "配車を登録します",
    body: "登録すると配車一覧に追加されます。次に詳細画面でメンバーへ回答依頼を共有します。",
  },
] satisfies GuidedTourStep[];

export default function Page() {
  return (
    <div className="app-page">
      <div className="app-container max-w-xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-teal-700">新規配車</p>
            <h1 className="app-section-title flex items-center gap-2">
              <Car size={26} className="text-teal-700" />
              配車登録
            </h1>
          </div>
          <GuidedTour
            storageKey="admin-new-ride-guided-tour:v1"
            steps={newRideGuideSteps}
            autoStart
            className="app-button-secondary w-full shrink-0 sm:w-auto"
          />
        </div>
        <div className="app-card p-6 md:p-8">
        <Suspense>
          <RideForm />
        </Suspense>
        </div>
      </div>
    </div>
  );
}
