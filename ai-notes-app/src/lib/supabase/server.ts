/**
 * Supabase 服务端客户端
 * 
 * 用于 Server Components、Server Actions 和 Route Handlers
 * 支持 Cookie 管理以维护用户会话
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 占位值，用于构建时避免错误
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在 Server Component 中调用时会忽略设置 Cookie
            // 如果有中间件刷新用户会话，可以忽略此错误
          }
        },
      },
    }
  );
}



