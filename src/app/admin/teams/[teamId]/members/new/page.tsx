import MemberForm from "../../../_components/MemberForm";

export default function Page() {
  return (
    <div className="flex justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 rounded-xl">
        <h1 className="text-2xl font-bold text-center mb-8">メンバー登録</h1>
        <MemberForm />
      </div>
    </div>
  );
}