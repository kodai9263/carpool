import { Users } from "lucide-react";
import TeamForm from "../_components/TeamForm";

export default function Page() {
  return (
    <div className="app-page">
      <div className="app-container max-w-xl">
        <div className="mb-6">
          <p className="mb-1 text-sm font-semibold text-teal-700">新規チーム</p>
          <h1 className="app-section-title flex items-center gap-2">
            <Users size={26} className="text-teal-700" />
            チーム作成
          </h1>
        </div>
        <div className="app-card p-6 md:p-8">
        <TeamForm />
        </div>
      </div>
    </div>
  );
}
