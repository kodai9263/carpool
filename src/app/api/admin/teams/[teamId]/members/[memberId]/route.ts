import { MemberFormValues } from "@/app/_types/member"; 
import { MemberDetailResponse, UpdateMemberResponse } from "@/app/_types/response/memberResponse";
import { withAdminTeamMember } from "@/utils/withAuth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export const runtime = "nodejs";

// メンバー詳細取得(自分のチームのみ)
export const GET = (request: NextRequest, ctx: { params: { teamId: string; memberId: string } }) =>
  withAdminTeamMember(request, async({ teamId, memberId }) => {
    try {
      const member = await prisma.member.findFirst({
        where: { id: memberId, teamId },
        select: { 
          id: true,
          name: true,
          children: {
            select: { id: true, name: true },
          }
        },
      });
      if (!member) return NextResponse.json({ message: "not found" }, { status: 404 });
      return NextResponse.json({ status: "OK", member } satisfies MemberDetailResponse, { status: 200 });
    } catch (e: any) {
      return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  }, ctx);

  // メンバー更新(自分のチームのみ)
  export const PUT = (request: NextRequest, ctx: { params: { teamId: string; memberId: string } }) =>
    withAdminTeamMember(request, async({ teamId, memberId }) => {
      const body = await request.json().catch(() => null) as MemberFormValues | null;
      if (!body) {
        return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 });
      }
      const memberName = body.name.trim();
      if (!memberName) return NextResponse.json({ message: "名前は入力してください"}, { status: 400 });

      let children: string[] | null = null;
      
      const cleaned = body.children
        .map((c) => c.name.trim())
        .filter((name): name is string => !!name);

      children = [...new Set(cleaned)];

      try {
        const member = await prisma.$transaction(async (tx) => {
          // メンバー名の更新
          const updateMember = await tx.member.update({
            where: { id: memberId, teamId },
            data: { name: memberName },
            select: { id: true, name: true },
          });

          // 子供の更新処理
          let childNames: string[];

          if(children) {
            // 更新前の子供の数
            const beforeCount = await tx.child.count({ where: { memberId } });

            // 既存の子供を削除
            await tx.child.deleteMany({ where: { memberId } });

            // 新しい子供作成(あれば)
            if (children.length) {
              await tx.child.createMany({
                data: children.map((name) => ({ name, memberId })),
              });
            }

            // チームのメンバーカウント差分調整
            const delta = children.length - beforeCount;
            if (delta !== 0) {
              await tx.team.update({
                where: { id: teamId },
                data: { memberCount: { increment: delta } },
              });
            }
            childNames = children;
          } else {
            // childrenがnullの場合は現在の子供の情報を返す
            const currentChildren = await tx.child.findMany({
              where: { memberId },
              select: { name: true },
              orderBy: { name: "asc" },
            });
            childNames = currentChildren.map(c => c.name);
          }
          return { 
            id: updateMember.id,
            name: updateMember.name, 
            children: childNames 
          };
        });

        return NextResponse.json(
          { status: "OK", message: "更新しました", member } satisfies UpdateMemberResponse,
          { status: 200 }
        );
      } catch (e: any) {
        return NextResponse.json({ message: "サーバ内部でエラーが発生しました" }, { status: 500 });
      }
    }, ctx);

    // メンバー削除
    export const DELETE = (request: NextRequest, ctx: { params: { teamId: string; memberId: string } }) =>
      withAdminTeamMember(request, async({ teamId, memberId }) =>{
        try {
          await prisma.member.deleteMany({
            where: {id: memberId, teamId },
          });
          return NextResponse.json({ status: "OK", message: "削除しました" }, { status: 200 });
        } catch (e: any) {
          if (e.code === "P2025") {
            return NextResponse.json({ message: "not found" }, { status: 400 });
          }
          return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
        }
      }, ctx);