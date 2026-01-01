import RideForm from "../_components/RideForm";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8">配車登録</h1>

      <div className="w-full max-w-[800px] bg-white rounded-xl shadow-lg p-8">
        <RideForm />
      </div>
    </div>
  );
}   