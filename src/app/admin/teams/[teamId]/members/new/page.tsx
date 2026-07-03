import GuidedTour, { type GuidedTourStep } from "@/app/_components/GuidedTour";
import { UserPlus } from "lucide-react";
import MemberForm from "../_components/MemberForm";

const newMemberGuideSteps = [
  {
    target: "admin-new-member-guardians",
    title: "保護者を登録します",
    body: "配車可否を回答する保護者名を入力します。送迎・引率を別々の保護者が担当する場合は、同じ家庭でも父・母などを分けて登録しておくと選びやすくなります。",
  },
  {
    target: "admin-new-member-children",
    title: "子どもを登録します",
    body: "配車対象になるお子さんの名前と学年を入力します。兄弟がいる場合は追加できます。",
  },
  {
    target: "admin-new-member-submit",
    title: "メンバーを登録します",
    body: "登録すると、配車回答画面でこの家族を選べるようになります。",
  },
] satisfies GuidedTourStep[];

export default function Page() {
  return (
    <div className="app-page">
      <div className="app-container max-w-xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-teal-700">新規メンバー</p>
            <h1 className="app-section-title flex items-center gap-2">
              <UserPlus size={26} className="text-teal-700" />
              メンバー登録
            </h1>
          </div>
          <GuidedTour
            storageKey="admin-new-member-guided-tour:v1"
            steps={newMemberGuideSteps}
            autoStart
            className="app-button-secondary w-full shrink-0 sm:w-auto"
          />
        </div>
        <div className="app-card p-6 md:p-8">
        <MemberForm />
        </div>
      </div>
    </div>
  );
}
