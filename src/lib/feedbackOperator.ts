import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdminId } from "@/utils/auth";

export async function isFeedbackOperator(request: NextRequest): Promise<boolean> {
  const operatorEmail = process.env.CARPOOL_FEEDBACK_OPERATOR_EMAIL?.trim().toLowerCase();
  if (!operatorEmail) return false;

  const adminId = await getAuthAdminId(request);
  if (!adminId) return false;

  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { email: true },
  });
  return admin?.email.toLowerCase() === operatorEmail;
}
