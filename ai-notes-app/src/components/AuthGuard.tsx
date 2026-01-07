"use client";

/**
 * AuthGuard - 认证守卫组件
 * 
 * 保护需要登录的页面
 * 未登录用户会显示加载状态或重定向到登录页
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface AuthGuardProps {
  children: React.ReactNode;
  /** 是否要求登录（默认 false，允许匿名使用） */
  requireAuth?: boolean;
}

export function AuthGuard({ children, requireAuth = false }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && requireAuth) {
      router.push("/login");
    }
  }, [user, loading, requireAuth, router]);

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  // 需要认证但未登录
  if (requireAuth && !user) {
    return null; // 会被重定向
  }

  // 已登录或不需要认证
  return <>{children}</>;
}

/**
 * 用户信息展示组件
 */
export function UserAvatar() {
  const { user, signOut } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
        {user.email?.charAt(0).toUpperCase() || "U"}
      </div>
      <button
        onClick={signOut}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        登出
      </button>
    </div>
  );
}



