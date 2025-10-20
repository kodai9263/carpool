import { NextRequest, NextResponse } from "next/server";
import { supabase } from "./supabase";

export const checkAuth = async (request: NextRequest) => {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer')) {
    return NextResponse.json({ status: '認証が必要です。'}, { status: 401});
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ status: '無効なトークンです。'}, { status: 401 });
  }

  return null;
};