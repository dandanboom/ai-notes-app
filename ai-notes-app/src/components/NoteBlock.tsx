"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
// @ts-ignore - react-textarea-autosize types may not be available
import TextareaAutosize from "react-textarea-autosize";
import { useRecorder } from "@/hooks/useRecorder";
import { InlineVoicePanel } from "./InlineVoicePanel";

export interface TextBlock {
  id: string;
  content: string;
  isEmpty: boolean;
}

interface NoteBlockProps {
  block: TextBlock;
  onEdit: (id: string, newContent: string) => void;
  onTranscription?: (id: string, text: string) => void;
  onInsertAfter?: (id: string, newContent: string) => void;
}

/**
 * Notion 风格的块编辑器组件
 * 每个 Block 是一个独立的 TextareaAutosize
 */
export const NoteBlock: React.FC<NoteBlockProps> = ({
  block,
  onEdit,
  onTranscription,
  onInsertAfter,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localContent, setLocalContent] = useState(block.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 手势追踪（用于左滑取消）
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // 录音逻辑
  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    errorMessage,
  } = useRecorder({
    onTranscription: (text) => {
      // 将转录结果插入到当前光标位置
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent =
          localContent.substring(0, start) +
          text +
          "\n\n" +
          localContent.substring(end);
        setLocalContent(newContent);
        onEdit(block.id, newContent);
        // 更新光标位置
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(
            start + text.length + 2,
            start + text.length + 2
          );
        }, 0);
      }
      // 同时通知父组件
      onTranscription?.(block.id, text);
    },
  });

  // 同步外部内容变化
  useEffect(() => {
    setLocalContent(block.content);
  }, [block.content]);

  // 处理内容变化
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    onEdit(block.id, newContent);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 键：创建新块
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (onInsertAfter) {
        onInsertAfter(block.id, "");
        // 聚焦到新块（通过父组件管理）
      }
    }
    // Backspace 在空行时删除块
    if (e.key === "Backspace" && localContent === "" && onInsertAfter) {
      // 由父组件处理删除逻辑
    }
  };

  // 侧边锚点的触摸事件处理（长按触发录音）
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleAnchorTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      setIsCancelling(false);

      // 长按 500ms 后开始录音
      longPressTimerRef.current = setTimeout(() => {
        startRecording();
        longPressTimerRef.current = null;
      }, 500);
    },
    [startRecording]
  );

  const handleAnchorTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    // 如果还在等待长按，检查是否移动超过阈值
    if (longPressTimerRef.current) {
      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
      const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
      
      // 移动超过 10px，取消长按
      if (distance > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
      return;
    }

    // 录音中：检查左滑
    if (isRecording) {
      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
      const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

      // 左滑超过 50px 且垂直移动小于水平移动
      if (deltaX < -50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        setIsCancelling(true);
      } else {
        setIsCancelling(false);
      }
    }
  }, [isRecording]);

  const handleAnchorTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 清除长按定时器
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        touchStartRef.current = null;
        return; // 快速点击，不开始录音
      }

      if (!touchStartRef.current) return;

      // Fix Point 3: 如果正在录音，根据 isCancelling 状态决定
      if (isRecording) {
        if (isCancelling) {
          // 左滑取消：丢弃录音，不发送
          stopRecording(true);
        } else {
          // 正常结束：停止录音 -> 立即发送数据
          stopRecording(false);
        }
      }

      touchStartRef.current = null;
      setIsCancelling(false);
    },
    [isRecording, isCancelling, stopRecording]
  );

  const handleAnchorTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isRecording) {
      stopRecording(true);
    }
    touchStartRef.current = null;
    setIsCancelling(false);
  }, [isRecording, stopRecording]);

  return (
    <div ref={containerRef} className="relative group">
      <div className="relative flex items-start gap-2">
        {/* 文本输入区域 - 移除 placeholder，实现无感编辑 */}
        <TextareaAutosize
          ref={textareaRef}
          value={localContent}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // 延迟设置 blur，让点击侧边锚点不会立刻失焦
            setTimeout(() => setIsFocused(false), 100);
          }}
          placeholder="" // Fix Point 1: 移除 placeholder
          className="
            flex-1
            text-[15px] leading-[24px] font-normal
            bg-transparent border-none outline-none
            resize-none
            focus:outline-none
            p-0 m-0
          "
          style={{
            fontFamily:
              '"PingFang SC", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        />

        {/* 侧边锚点（仅在焦点时显示） */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-0 top-1/2 -translate-y-1/2"
              style={{ touchAction: "none" }}
            >
              <motion.button
                type="button"
                onTouchStart={handleAnchorTouchStart}
                onTouchMove={handleAnchorTouchMove}
                onTouchEnd={handleAnchorTouchEnd}
                onTouchCancel={handleAnchorTouchCancel}
                className={`
                  w-[24px] h-[24px] rounded-full
                  flex items-center justify-center
                  transition-colors
                  touch-none
                  ${isCancelling ? "bg-red-100" : "bg-[#E5E5E5] hover:bg-[#D0D0D0]"}
                `}
                style={{
                  touchAction: "none",
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className={isCancelling ? "text-red-500" : "text-[#666666]"}
                >
                  <rect x="1" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" />
                  <rect x="4" y="2" width="1.5" height="8" rx="0.75" fill="currentColor" />
                  <rect x="7" y="3" width="1.5" height="6" rx="0.75" fill="currentColor" />
                  <rect x="10" y="1" width="1.5" height="10" rx="0.75" fill="currentColor" />
                </svg>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 行内语音面板（悬浮在当前行上方，从右侧展开） */}
      <AnimatePresence>
        {isFocused && isRecording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-[-70px] right-0 z-[200] pointer-events-auto"
          >
            <InlineVoicePanel
              isRecording={isRecording}
              recordingDuration={recordingDuration}
              onDiscard={() => stopRecording(true)}
              onSend={() => stopRecording(false)} // Fix Point 3: 使用 onSend
              isCancelling={isCancelling}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误提示 */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="
              absolute top-full left-0 mt-2
              bg-red-500 text-white text-xs
              px-3 py-2 rounded-lg
              max-w-[200px] z-[200]
              shadow-lg
            "
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


