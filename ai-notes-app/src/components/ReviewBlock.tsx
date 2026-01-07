"use client";

import React from "react";
import { motion } from "framer-motion";

interface ReviewBlockProps {
  /** 原始内容（旧文本） */
  originalContent: string;
  /** 新内容（AI 生成的修改后文本） */
  newContent: string;
}

/**
 * ReviewBlock - 在正文列表中显示 Diff 视图
 * 
 * 垂直堆叠布局（Stacked Layout）：
 * - 上半部分：删除的内容（红色背景 + 删除线）
 * - 下半部分：新增的内容（绿色背景）
 */
export const ReviewBlock: React.FC<ReviewBlockProps> = ({
  originalContent,
  newContent,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="overflow-hidden rounded-lg"
    >
      {/* 上半部分：删除的内容（旧文本） */}
      {originalContent && (
        <div className="bg-[#FFE9E9] p-4 rounded-t-lg">
          <p className="text-[15px] leading-[24px] text-[#D32F2F] line-through whitespace-pre-wrap">
            {originalContent}
          </p>
        </div>
      )}
      
      {/* 下半部分：新增的内容（新文本） */}
      <div className={`bg-[#E5FAF1] p-4 ${originalContent ? 'rounded-b-lg' : 'rounded-lg'}`}>
        <p className="text-[15px] leading-[24px] text-[#00A870] whitespace-pre-wrap">
          {newContent}
        </p>
      </div>
    </motion.div>
  );
};

export default ReviewBlock;




