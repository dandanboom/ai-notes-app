"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Plus, User, LogOut, LogIn } from "lucide-react";
import { NotebookCard, NewNotebookCard } from "@/components/NotebookCard";
import { getNotebooks, createNotebook } from "@/app/actions/noteActions";
import { useAuth } from "@/hooks/useAuth";

// 类型定义
interface NotebookWithPreview {
  id: string;
  title: string;
  emoji: string | null;
  updatedAt: Date;
  notes: {
    content: string;
  }[];
}

// 本地模式 key
const LOCAL_MODE_KEY = "ai-notes-local-mode";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [notebooks, setNotebooks] = useState<NotebookWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState<boolean | null>(null);

  // 检查本地模式
  useEffect(() => {
    const localMode = localStorage.getItem(LOCAL_MODE_KEY) === "true";
    setIsLocalMode(localMode);
  }, []);

  // 加载笔记本列表
  const loadNotebooks = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const result = await getNotebooks();

      if (result.success) {
        // 按更新时间排序
        const sorted = [...result.data].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setNotebooks(sorted);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("加载笔记本失败:", err);
      setError("加载笔记本时发生错误");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // 等待本地模式状态初始化
    if (isLocalMode === null) return;

    if (authLoading) return;

    if (user) {
      // 已登录，加载云端数据
      loadNotebooks();
    } else if (isLocalMode) {
      // 本地模式，显示空状态
      setLoading(false);
      setNotebooks([]);
    } else {
      // 未登录且非本地模式，跳转登录页
      router.push("/login");
    }
  }, [user, authLoading, isLocalMode, loadNotebooks, router]);

  // 创建新笔记本
  const handleCreateNotebook = async () => {
    if (isCreating) return;

    // 本地模式：创建本地笔记本
    if (isLocalMode && !user) {
      const localId = `local-${Date.now()}`;
      router.push(`/notebook/${localId}`);
      return;
    }

    try {
      setIsCreating(true);
      const result = await createNotebook();

      if (result.success) {
        // 直接跳转到新笔记本
        router.push(`/notebook/${result.data.id}`);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("创建笔记本失败:", err);
      setError("创建笔记本时发生错误");
    } finally {
      setIsCreating(false);
    }
  };

  // 获取笔记本的预览内容
  const getPreview = (notebook: NotebookWithPreview) => {
    if (notebook.notes && notebook.notes.length > 0) {
      return notebook.notes[0].content;
    }
    return "";
  };

  // 切换到登录模式
  const handleSwitchToLogin = () => {
    localStorage.removeItem(LOCAL_MODE_KEY);
    router.push("/login");
  };

  // 退出登录
  const handleSignOut = () => {
    signOut();
    setShowUserMenu(false);
  };

  // 初始化状态
  if (authLoading || isLocalMode === null) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#F5F5F7]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-gray-200 md:py-10 overflow-hidden">
      {/* The Viewport Container - Mobile App Architecture */}
      <div
        className="
          relative 
          w-full max-w-[393px] 
          h-full md:h-[852px] 
          bg-[#F5F5F7] shadow-xl 
          overflow-hidden mx-auto 
          flex flex-col
        "
        style={{
          fontFamily:
            '"PingFang SC", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Header */}
        <header className="flex-none bg-[#F5F5F7] pt-12 px-4 pb-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">All Docs</h1>
            <div className="flex items-center gap-2">
              {/* Local Mode Badge */}
              {isLocalMode && !user && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                  本地模式
                </span>
              )}
              
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center"
                >
                  {user?.email ? (
                    <span className="text-sm font-medium text-gray-700">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User size={18} className="text-gray-500" />
                  )}
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      {/* Menu */}
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50"
                      >
                        {user ? (
                          <>
                            <div className="px-4 py-3 border-b border-gray-100">
                              <p className="text-xs text-gray-500">登录账号</p>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.email}
                              </p>
                            </div>
                            <button
                              onClick={handleSignOut}
                              className="w-full px-4 py-3 flex items-center gap-2 text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <LogOut size={16} />
                              <span className="text-sm">退出登录</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="px-4 py-3 border-b border-gray-100">
                              <p className="text-xs text-gray-500">当前状态</p>
                              <p className="text-sm font-medium text-gray-900">
                                本地模式（数据不同步）
                              </p>
                            </div>
                            <button
                              onClick={handleSwitchToLogin}
                              className="w-full px-4 py-3 flex items-center gap-2 text-blue-500 hover:bg-blue-50 transition-colors"
                            >
                              <LogIn size={16} />
                              <span className="text-sm">登录账号</span>
                            </button>
                          </>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
              />
            </div>
            <button className="flex items-center gap-1 px-3 py-3 bg-white rounded-xl shadow-sm border border-gray-100">
              <span className="text-sm text-gray-600">Keyword</span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24">
          {/* Error State */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={loadNotebooks}
                className="mt-2 text-sm text-red-500 underline"
              >
                重试
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white/50 rounded-3xl min-h-[180px] animate-pulse"
                />
              ))}
            </div>
          ) : (
            /* Notebook Grid */
            <div className="grid grid-cols-2 gap-4">
              {notebooks.map((notebook, index) => (
                <NotebookCard
                  key={notebook.id}
                  id={notebook.id}
                  title={notebook.title}
                  emoji={notebook.emoji}
                  preview={getPreview(notebook)}
                  updatedAt={new Date(notebook.updatedAt)}
                  index={index}
                />
              ))}
              {/* New Notebook Card */}
              <NewNotebookCard onClick={handleCreateNotebook} />
            </div>
          )}

          {/* Local Mode Empty State */}
          {isLocalMode && !user && notebooks.length === 0 && !loading && (
            <div className="mt-8 text-center">
              <p className="text-gray-500 text-sm mb-4">
                本地模式 - 数据仅保存在此设备
              </p>
              <p className="text-gray-400 text-xs">
                点击上方卡片创建第一个笔记本
              </p>
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
          onClick={handleCreateNotebook}
          disabled={isCreating}
          className="absolute bottom-6 right-6 w-14 h-14 bg-black rounded-full shadow-lg flex items-center justify-center z-50 active:scale-95 transition-transform disabled:opacity-50"
        >
          {isCreating ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Plus size={24} className="text-white" />
          )}
        </motion.button>
      </div>
    </main>
  );
}
