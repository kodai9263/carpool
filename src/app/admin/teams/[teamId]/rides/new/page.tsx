import RideForm from "../_components/RideForm";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center py-4 md:py-10 px-4">
      <div className="w-full max-w-[500px] bg-white rounded-xl shadow-xl p-4 md:p-8">
        <h1 className="text-3xl font-bold text-center mb-8">🚗 配車登録</h1>
        <RideForm />
      </div>
    </div>
  );
}   