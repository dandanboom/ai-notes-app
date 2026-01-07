"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface NotebookCardProps {
  id: string;
  title: string;
  emoji?: string | null;
  preview?: string;
  updatedAt: Date;
  index: number;
}

export function NotebookCard({
  id,
  title,
  emoji,
  preview,
  updatedAt,
  index,
}: NotebookCardProps) {
  // 格式化日期
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return "今天";
    } else if (days === 1) {
      return "昨天";
    } else if (days < 7) {
      return `${days} 天前`;
    } else {
      return date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // 截取预览文本
  const truncatePreview = (text: string, maxLength: number = 60) => {
    if (!text) return "";
    // 移除 Markdown 标记
    const cleaned = text
      .replace(/#{1,6}\s/g, "") // 标题
      .replace(/\*\*([^*]+)\*\*/g, "$1") // 加粗
      .replace(/\*([^*]+)\*/g, "$1") // 斜体
      .replace(/`([^`]+)`/g, "$1") // 代码
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // 链接
      .replace(/[-*+]\s/g, "") // 列表
      .replace(/\n/g, " ") // 换行
      .trim();

    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.slice(0, maxLength) + "...";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: "easeOut",
      }}
    >
      <Link href={`/notebook/${id}`}>
        <div className="bg-white rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-shadow duration-200 active:scale-[0.98] min-h-[180px] flex flex-col">
          {/* Emoji 图标 */}
          <div className="text-3xl mb-3">{emoji || "📝"}</div>

          {/* 标题 */}
          <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mb-2">
            {title || "无标题"}
          </h3>

          {/* 预览内容 */}
          <p className="text-sm text-gray-500 line-clamp-2 flex-1">
            {preview ? truncatePreview(preview) : "空白笔记"}
          </p>

          {/* 日期 */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">{formatDate(updatedAt)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// 新建笔记本卡片
export function NewNotebookCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <button
        onClick={onClick}
        className="w-full bg-white/50 border-2 border-dashed border-gray-200 rounded-3xl p-5 min-h-[180px] flex flex-col items-center justify-center gap-3 hover:bg-white hover:border-gray-300 transition-all duration-200 active:scale-[0.98]"
      >
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span className="text-sm font-medium text-gray-500">新建笔记本</span>
      </button>
    </motion.div>
  );
}




