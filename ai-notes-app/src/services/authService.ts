/**
 * Auth Service - 认证服务层
 * 
 * 封装所有认证相关的业务逻辑
 * 可被 Server Actions 和 API Routes 共同调用
 */

import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

// ============================================
// 类型定义
// ============================================

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
}

export type AuthResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code: "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR" };

// ============================================
// 核心认证方法
// ============================================

/**
 * 获取当前登录用户（原始 Supabase User 对象）
 * 
 * @returns User | null
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error("❌ [AuthService] 获取用户失败:", error);
    return null;
  }
}

/**
 * 获取当前登录用户（简化的用户信息）
 * 
 * @returns AuthUser | null
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email ?? undefined,
    name: user.user_metadata?.name || user.user_metadata?.full_name,
  };
}

/**
 * 验证用户是否已登录
 * 用于需要认证的操作
 * 
 * @returns AuthResult with user data or error
 */
export async function requireAuth(): Promise<AuthResult<AuthUser>> {
  const user = await getAuthUser();
  
  if (!user) {
    return {
      success: false,
      error: "请先登录",
      code: "UNAUTHORIZED",
    };
  }
  
  return {
    success: true,
    data: user,
  };
}

/**
 * 从请求头中获取用户（用于 API Routes）
 * 支持 Bearer Token 认证
 * 
 * @param request - HTTP Request 对象
 * @returns AuthResult with user data or error
 */
export async function authenticateRequest(request: Request): Promise<AuthResult<AuthUser>> {
  // 方式1: 通过 Cookie（Server-side session）
  const user = await getAuthUser();
  if (user) {
    return { success: true, data: user };
  }
  
  // 方式2: 通过 Authorization Header（未来 RN 使用）
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    
    try {
      const supabase = await createClient();
      const { data: { user: tokenUser }, error } = await supabase.auth.getUser(token);
      
      if (error || !tokenUser) {
        return {
          success: false,
          error: "Token 无效或已过期",
          code: "UNAUTHORIZED",
        };
      }
      
      return {
        success: true,
        data: {
          id: tokenUser.id,
          email: tokenUser.email ?? undefined,
          name: tokenUser.user_metadata?.name || tokenUser.user_metadata?.full_name,
        },
      };
    } catch (error) {
      console.error("❌ [AuthService] Token 验证失败:", error);
      return {
        success: false,
        error: "认证失败",
        code: "INTERNAL_ERROR",
      };
    }
  }
  
  return {
    success: false,
    error: "请先登录",
    code: "UNAUTHORIZED",
  };
}

