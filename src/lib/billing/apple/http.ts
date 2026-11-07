import { NextRequest, NextResponse } from "next/server";
import { AppleBillingError } from "./types";

const MAX_BODY_BYTES = 256 * 1024;

export async function readAppleBody(request: NextRequest): Promise<Record<string, unknown>> {
  if (!request.body) throw new AppleBillingError("invalid_purchase");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new AppleBillingError("invalid_purchase");
      }
      chunks.push(value);
    }
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid body");
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AppleBillingError) throw error;
    throw new AppleBillingError("invalid_purchase");
  } finally {
    reader.releaseLock();
  }
}

export function appleErrorResponse(error: unknown) {
  if (error instanceof AppleBillingError) {
    return NextResponse.json({ message: error.message, code: error.code }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
  }
  // 署名データ・Appleの応答・秘密鍵をログやレスポンスへ出さない。
  return NextResponse.json({ message: "購入情報を保存できませんでした。時間をおいて購入を復元してください。", code: "save_failed" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
}
