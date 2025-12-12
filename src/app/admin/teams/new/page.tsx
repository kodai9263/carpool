import TeamForm from "../_components/TeamForm";

export default function Page() {
  return (
    <div className="flex justify-center min-h-screen">
      <div className="w-full max-w-md p-8 rounded-xl">
        <h1 className="text-2xl font-bold text-center mb-8">チーム作成</h1>
        <TeamForm />
      </div>
    </div>
  );
}