"use client";

import React, { useState } from "react";
import { ChevronLeft, MoreHorizontal, Cloud, CloudOff, User, Trash2 } from "lucide-react";
import { GlassButton } from "./GlassButton";
import { useAuth } from "@/hooks/useAuth";
import { useIsSyncing, useSyncError, useNoteStore } from "@/store/noteStore";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { deleteNotebook } from "@/app/actions/noteActions";

interface NavigationBarProps {
  notebookId?: string;
}

export default function NavigationBar({ notebookId }: NavigationBarProps) {
  const { user, signOut, loading } = useAuth();
  const isSyncing = useIsSyncing();
  const syncError = useSyncError();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const reset = useNoteStore((state) => state.reset);

  const handleUserClick = () => {
    if (user) {
      // 已登录：显示菜单或登出
      signOut();
    } else {
      // 未登录：跳转到登录页
      router.push("/login");
    }
  };

  const handleBackClick = () => {
    router.push("/");
  };

  const handleDeleteNotebook = async () => {
    if (!notebookId || isDeleting) return;

    const confirmed = window.confirm(
      "确定要删除这个笔记本吗？此操作无法撤销。"
    );

    if (!confirmed) {
      setShowMenu(false);
      return;
    }

    try {
      setIsDeleting(true);
      
      // 本地模式笔记本
      if (notebookId.startsWith("local-")) {
        // 删除 localStorage 中的数据
        localStorage.removeItem(`notebook-${notebookId}`);
        reset();
        router.push("/");
        return;
      }

      const result = await deleteNotebook(notebookId);

      if (result.success) {
        // 重置 store 状态
        reset();
        // 返回首页
        router.push("/");
      } else {
        alert(`删除失败: ${result.error}`);
      }
    } catch (error) {
      console.error("删除笔记本失败:", error);
      alert("删除笔记本时发生错误");
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="w-full flex flex-col pointer-events-none pt-safe">
      {/* Nav Content */}
      <div className="h-[50px] flex justify-between px-4 items-center pointer-events-auto">
        {/* 左侧：返回按钮 */}
        <GlassButton icon={ChevronLeft} onClick={handleBackClick} />
        
        {/* 中间：同步状态 */}
        <div className="flex items-center gap-2">
          {user && notebookId && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {isSyncing ? (
                <>
                  <Cloud size={14} className="animate-pulse text-blue-500" />
                  <span>同步中...</span>
                </>
              ) : syncError ? (
                <>
                  <CloudOff size={14} className="text-red-500" />
                  <span className="text-red-500">同步失败</span>
                </>
              ) : (
                <>
                  <Cloud size={14} className="text-green-500" />
                  <span>已同步</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* 右侧：用户/设置 */}
        <div className="flex items-center gap-2">
          {!loading && (
            <button
              onClick={handleUserClick}
              className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm border border-white/50 shadow-sm flex items-center justify-center"
              title={user ? user.email || "用户" : "登录"}
            >
              {user ? (
                <span className="text-xs font-medium text-gray-700">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </span>
              ) : (
                <User size={16} className="text-gray-500" />
              )}
            </button>
          )}
          
          {/* More Button with Dropdown */}
          <div className="relative">
            <GlassButton 
              icon={MoreHorizontal} 
              onClick={() => setShowMenu(!showMenu)}
            />

            <AnimatePresence>
              {showMenu && notebookId && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  
                  {/* Dropdown Menu */}
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50"
                  >
                    <button
                      onClick={handleDeleteNotebook}
                      disabled={isDeleting}
                      className="w-full px-4 py-3 flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      <span className="text-sm font-medium">
                        {isDeleting ? "删除中..." : "删除笔记本"}
                      </span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}


