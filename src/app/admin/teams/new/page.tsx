import TeamForm from "../_components/TeamForm";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center py-10">
      <div className="w-full max-w-[800px] bg-white rounded-xl shadow-xl p-10 border border-gray-100">
      <h1 className="text-3xl font-bold text-center mb-8">🚗 チーム作成</h1>
        <TeamForm />
      </div>
    </div>
  );
}