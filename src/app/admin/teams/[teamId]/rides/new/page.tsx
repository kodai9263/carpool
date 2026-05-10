import { Car } from "lucide-react";
import RideForm from "../_components/RideForm";

export default function Page() {
  return (
    <div className="app-page">
      <div className="app-container max-w-xl">
        <div className="mb-6">
          <p className="mb-1 text-sm font-semibold text-teal-700">新規配車</p>
          <h1 className="app-section-title flex items-center gap-2">
            <Car size={26} className="text-teal-700" />
            配車登録
          </h1>
        </div>
        <div className="app-card p-6 md:p-8">
        <RideForm />
        </div>
      </div>
    </div>
  );
}
