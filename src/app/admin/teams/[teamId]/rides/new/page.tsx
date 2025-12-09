import RideForm from "../_components/RideForm";

export default function Page() {
  return (
    <div className="flex justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 rounded-xl">
        <h1 className="text-2xl font-bold text-center mb-8">配車登録</h1>
        <RideForm />
      </div>
    </div>
  );
}   