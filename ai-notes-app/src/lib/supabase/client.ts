/**
 * Supabase 浏览器客户端
 * 
 * 用于客户端组件中的 Supabase 操作
 * 注意：此客户端只能在浏览器环境中使用
 */

import { createBrowserClient } from "@supabase/ssr";

// 占位 URL 和 Key，用于构建时避免错误
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

