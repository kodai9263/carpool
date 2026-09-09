import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function resolveBillingReturnPath(adminId: number, value: unknown) {
  if (typeof value !== "string") return "/admin/profile";
  const match = /^\/admin\/teams\/([1-9]\d*)\/rides\/([1-9]\d*)$/.exec(value);
  if (!match) return "/admin/profile";
  const teamId = Number(match[1]);
  const id = Number(match[2]);
  if (!Number.isSafeInteger(teamId) || !Number.isSafeInteger(id)) return "/admin/profile";
  const ride = await prisma.ride.findFirst({ where: { id, teamId, team: { adminId } }, select: { id: true } });
  return ride ? value : "/admin/profile";
}

export function billingReturnUrl(request: NextRequest, path: string, query: string) {
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin).origin;
  return `${origin}${path}?${query}${path === "/admin/profile" ? "#plan" : ""}`;
}

export function billingSource(value: unknown) {
  return typeof value === "string" && /^[a-z0-9_]{1,64}$/.test(value) ? value : "profile";
}

export function stripeId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id;
}
