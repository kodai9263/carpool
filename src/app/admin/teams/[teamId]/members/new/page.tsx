import MemberForm from "../_components/MemberForm";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center py-10">
      <div className="w-full max-w-[500px] bg-white rounded-xl shadow-xl p-10 border border-gray-100">
        <h1 className="text-3xl font-bold text-center mb-8">👤 メンバー登録</h1>
        <MemberForm />
      </div>
    </div>
  );
}