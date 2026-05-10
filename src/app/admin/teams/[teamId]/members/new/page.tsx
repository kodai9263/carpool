import { UserPlus } from "lucide-react";
import MemberForm from "../_components/MemberForm";

export default function Page() {
  return (
    <div className="app-page">
      <div className="app-container max-w-xl">
        <div className="mb-6">
          <p className="mb-1 text-sm font-semibold text-teal-700">新規メンバー</p>
          <h1 className="app-section-title flex items-center gap-2">
            <UserPlus size={26} className="text-teal-700" />
            メンバー登録
          </h1>
        </div>
        <div className="app-card p-6 md:p-8">
        <MemberForm />
        </div>
      </div>
    </div>
  );
}
