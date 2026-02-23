"use client";

import { useMemo } from "react";

interface Props {
  children: { id: number; name: string; memberId?: number }[];
  members: { id: number; name: string }[];
  notParticipatingIds: Set<number>;
  onToggle: (childId: number) => void;
}

export default function ChildAvailabilitySection({
  children,
  members,
  notParticipatingIds,
  onToggle,
}: Props) {
  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m.name])),
    [members]
  );

  // 保護者IDでグループ化
  const grouped = useMemo(() => {
    const map = new Map<number, { id: number; name: string }[]>();
    children.forEach((child) => {
      if (child.memberId === undefined) return;
      if (!map.has(child.memberId)) map.set(child.memberId, []);
      map.get(child.memberId)!.push({ id: child.id, name: child.name });
    });
    return map;
  }, [children]);

  if (children.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">子どもの参加可否</h2>
      <p className="text-sm text-gray-500">参加可否を選択してください</p>

      <div className="space-y-3">
        {[...grouped.entries()].map(([memberId, childList]) => (
          <div key={memberId} className="p-3 md:p-4 border rounded-lg bg-gray-50 space-y-2">
            <div className="space-y-2">
              {childList.map((child) => {
                const isNotParticipating = notParticipatingIds.has(child.id);
                return (
                  <div key={child.id} className="flex items-center gap-4 min-h-[44px]">
                    <span className="text-base flex-1">{child.name}</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={`child-${child.id}`}
                        checked={!isNotParticipating}
                        onChange={() => { if (isNotParticipating) onToggle(child.id); }}
                        className="w-4 h-4 accent-teal-600"
                      />
                      <span className="text-base">参加</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name={`child-${child.id}`}
                        checked={isNotParticipating}
                        onChange={() => { if (!isNotParticipating) onToggle(child.id); }}
                        className="w-4 h-4 accent-red-500"
                      />
                      <span className="text-base">不参加</span>
                    </label>
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
