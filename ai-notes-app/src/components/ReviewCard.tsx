"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import * as Diff from "diff";
import type { AIResponse } from "@/types/ai";

interface ReviewCardProps {
  /** AI 返回的响应 */
  response: AIResponse;
  /** 原始内容（用于计算统计） */
  originalContent: string;
  /** 确认采纳修改 */
  onConfirm: () => void;
  /** 放弃修改 */
  onReject: () => void;
}

/**
 * ReviewCard - 底部操作栏
 * 
 * 根据 Figma Page/ReviewMode 设计：
 * - Header: "修改项" + 统计 (+N, -N)
 * - AI 说明文字
 * - 两个操作按钮
 */
export const ReviewCard: React.FC<ReviewCardProps> = ({
  response,
  originalContent,
  onConfirm,
  onReject,
}) => {
  // 计算增删统计
  const stats = useMemo(() => {
    const changes = Diff.diffWords(originalContent || "", response.content || "");
    let additions = 0;
    let deletions = 0;

    changes.forEach((change) => {
      if (change.added) {
        additions += change.value.length;
      } else if (change.removed) {
        deletions += change.value.length;
      }
    });

    return { additions, deletions };
  }, [originalContent, response.content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="
        fixed bottom-8 left-4 right-4
        z-[200]
        max-w-md mx-auto
        bg-white
        rounded-2xl
        shadow-[0_8px_30px_rgb(0,0,0,0.12)]
        p-5
      "
    >
      {/* Header: 修改项 + 统计 */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[16px] font-semibold text-[#1a1a1a]">修改项</span>
        <div className="flex items-center gap-2">
          {stats.additions > 0 && (
            <span className="text-[#00A870] text-[14px] font-medium">
              +{stats.additions}
            </span>
          )}
          {stats.deletions > 0 && (
            <span className="text-[#D32F2F] text-[14px] font-medium">
              −{stats.deletions}
            </span>
          )}
        </div>
      </div>

      {/* AI 思路说明 */}
      {response.thought && (
        <p className="text-[14px] text-[#666666] leading-[21px] mb-4">
          {response.thought}
        </p>
      )}

      {/* 操作按钮 - Figma 设计：文字在前，图标在后 */}
      <div className="flex gap-3">
        {/* 放弃按钮 */}
        <button
          type="button"
          onClick={onReject}
          className="
            flex-1 h-11
            flex items-center justify-center gap-2
            bg-white border border-gray-200 
            text-[#D32F2F] font-medium text-[15px]
            rounded-xl
            transition-colors
            active:bg-gray-50
          "
        >
          <span>放弃</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* 采纳按钮 */}
        <button
          type="button"
          onClick={onConfirm}
          className="
            flex-1 h-11
            flex items-center justify-center gap-2
            bg-white border border-gray-200
            text-[#00A870] font-medium text-[15px]
            rounded-xl
            transition-colors
            active:bg-gray-50
          "
        >
          <span>采纳</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17L4 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

export default ReviewCard;

