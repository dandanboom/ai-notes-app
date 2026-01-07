"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Send } from "lucide-react";

interface InlineVoicePanelProps {
  isRecording: boolean;
  recordingDuration: number;
  onDiscard: () => void;
  /** 停止录音并发送（Fix Point 3 核心） */
  onSend: () => void;
  isCancelling?: boolean;
}

/**
 * 行内语音面板 - Bar/RecordingSession 组件
 * 严格复刻 Figma 中的"液态玻璃"效果
 * 
 * Fix Point 3: 重写交互逻辑
 * - onDiscard: 丢弃录音（左滑取消或点击垃圾桶）
 * - onSend: 停止录音并发送数据
 */
export const InlineVoicePanel: React.FC<InlineVoicePanelProps> = ({
  isRecording,
  recordingDuration,
  onDiscard,
  onSend,
  isCancelling = false,
}) => {
  // 格式化录音时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, x: 24, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 24, scale: 0.9 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 30
          }}
          className="
            flex items-center gap-3
            h-[56px] px-4
            bg-white/80 backdrop-blur-xl
            rounded-full
            shadow-[0_4px_20px_rgba(0,0,0,0.1)]
            relative
            overflow-visible
          "
          style={{
            // 液态玻璃效果
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* 左侧展开区：从右向左排列 */}
          <motion.div 
            className="flex items-center gap-3 flex-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.2 }}
          >
            {/* 时间显示（最左侧） */}
            <span className="text-[15px] font-medium text-[#282828] tabular-nums min-w-[40px]">
              {formatDuration(recordingDuration)}
            </span>

            {/* 波形可视化 */}
            <div className="flex items-center gap-[2px] h-[24px]">
              {Array.from({ length: 24 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[2px] bg-[#282828] rounded-full"
                  animate={{
                    height: isRecording
                      ? [8, 4 + Math.random() * 16, 8]
                      : 4,
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: isRecording ? Infinity : 0,
                    delay: i * 0.02,
                  }}
                  style={{ height: 4 }}
                />
              ))}
            </div>

            {/* 删除按钮 */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("🗑️ [InlineVoicePanel] 删除按钮被点击");
                onDiscard();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("🗑️ [InlineVoicePanel] 删除按钮被触摸");
                onDiscard();
              }}
              className={`
                p-2 rounded-full transition-colors
                ${isCancelling ? "bg-red-50" : "hover:bg-black/5"}
              `}
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Trash2
                size={16}
                className={isCancelling ? "text-red-500" : "text-[#888888]"}
              />
            </button>
          </motion.div>

          {/* 右侧：发送按钮（蓝色圆形） */}
          <motion.button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("📤 [InlineVoicePanel] 发送按钮被点击");
              onSend();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("📤 [InlineVoicePanel] 发送按钮被触摸");
              onSend();
            }}
            className="
              flex-shrink-0
              w-[48px] h-[48px] rounded-full
              bg-[#007AFF] flex items-center justify-center
              shadow-lg cursor-pointer
              select-none
            "
            style={{
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send size={20} className="text-white ml-0.5" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

