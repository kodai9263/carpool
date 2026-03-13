import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// キャッシュの有効期限（5分）
const TTL_MS = 5 * 60 * 1000;

type CacheEntry = { result: boolean; expiry: number };

// teamId:pin をキーに検証結果をキャッシュ
const cache = new Map<string, CacheEntry>();

/**
 * メンバー側PINの検証（結果をインメモリキャッシュで最適化）
 * - 初回: DBクエリ + bcrypt.compare（~100ms）
 * - 2回目以降（TTL内）: Mapルックアップのみ（< 1ms）
 * @returns true: 認証OK, false: PIN不一致, null: チームが見つからない
 */
export async function verifyMemberPin(teamId: number, pin: string): Promise<boolean | null> {
  const key = `${teamId}:${pin}`;
  const now = Date.now();

  // キャッシュヒット
  const cached = cache.get(key);
  if (cached && cached.expiry > now) {
    return cached.result;
  }

  // DBからハッシュを取得
  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: { viewPinHash: true },
  });
  if (!team?.viewPinHash) return null;

  // bcrypt検証
  const result = await bcrypt.compare(pin, team.viewPinHash);

  // 結果をキャッシュ（成功・失敗ともにキャッシュしてbcryptの繰り返し実行を防ぐ）
  cache.set(key, { result, expiry: now + TTL_MS });

  return result;
}
