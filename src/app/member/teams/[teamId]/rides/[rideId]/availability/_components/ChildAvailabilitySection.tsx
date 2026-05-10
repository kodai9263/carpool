"use client";

import { useMemo } from "react";

interface Props {
  childList: { id: number; name: string; memberId?: number }[];
  notParticipatingIds: Set<number>;
  selfDrivingIds: Set<number>;
  onToggleNotParticipating: (childId: number) => void;
  onToggleSelfDriving: (childId: number) => void;
}

export default function ChildAvailabilitySection({
  childList,
  notParticipatingIds,
  selfDrivingIds,
  onToggleNotParticipating,
  onToggleSelfDriving,
}: Props) {
  // 保護者IDでグループ化
  const grouped = useMemo(() => {
    const map = new Map<number, { id: number; name: string }[]>();
    childList.forEach((child) => {
      if (child.memberId === undefined) return;
      if (!map.has(child.memberId)) map.set(child.memberId, []);
      map.get(child.memberId)!.push({ id: child.id, name: child.name });
    });
    return map;
  }, [childList]);

  if (childList.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-950">子どもの参加可否</h2>
        <p className="mt-1 text-sm text-gray-500">参加可否を選択してください</p>
      </div>

      <div className="space-y-3">
        {[...grouped.entries()].map(([memberId, childList]) => (
          <div key={memberId} className="space-y-2 rounded-xl border border-white/80 bg-white/95 p-4 shadow-[0_14px_34px_rgba(15,118,110,0.08)] ring-1 ring-gray-950/[0.02] md:p-5">
            <div className="space-y-2">
              {childList.map((child) => {
                const isNotParticipating = notParticipatingIds.has(child.id);
                const isSelfDriving = selfDrivingIds.has(child.id);
                // 参加 = 不参加でも自走でもない
                const isParticipating = !isNotParticipating && !isSelfDriving;

                return (
                  <div key={child.id} className="flex items-center gap-3 min-h-[44px] flex-wrap">
                    <span className="text-base flex-1 min-w-[80px]">{child.name}</span>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`child-${child.id}`}
                          checked={isParticipating}
                          onChange={() => {
                            // 不参加 → 参加
                            if (isNotParticipating) onToggleNotParticipating(child.id);
                            // 自走 → 参加
                            if (isSelfDriving) onToggleSelfDriving(child.id);
                          }}
                          className="w-4 h-4 accent-teal-600"
                        />
                        <span className="text-base">参加</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`child-${child.id}`}
                          checked={isSelfDriving}
                          onChange={() => {
                            // 不参加 → 自走の場合は不参加を解除
                            if (isNotParticipating) onToggleNotParticipating(child.id);
                            // 自走をトグル
                            onToggleSelfDriving(child.id);
                          }}
                          className="w-4 h-4 accent-blue-500"
                        />
                        <span className="text-base">自走</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`child-${child.id}`}
                          checked={isNotParticipating}
                          onChange={() => {
                            // 自走 → 不参加の場合は自走を解除
                            if (isSelfDriving) onToggleSelfDriving(child.id);
                            // 不参加をトグル
                            onToggleNotParticipating(child.id);
                          }}
                          className="w-4 h-4 accent-red-500"
                        />
                        <span className="text-base">不参加</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
