import { redirect } from "next/navigation";

export default function Page({ params }: { params: { teamId: string } }) {
  redirect(`/admin/teams/${params.teamId}/members/new`);
}
