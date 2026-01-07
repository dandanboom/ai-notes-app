/**
 * Next.js 中间件
 * 
 * 主要功能：
 * 1. 刷新 Supabase 用户会话
 * 2. 路由保护（可选）
 */

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 需要登录的路由（目前设为空，允许匿名使用）
const protectedRoutes: string[] = [];

// 已登录用户应跳过的路由
const authRoutes = ["/login"];

export async function middleware(request: NextRequest) {
  // 刷新会话
  const response = await updateSession(request);
  
  // 注意：如果需要严格的路由保护，在 updateSession 中处理
  // 目前允许匿名使用，用户可以选择登录以同步数据
  
  return response;
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了以下开头的：
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (浏览器图标)
     * - 静态资源文件
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};



