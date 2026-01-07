"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "@/types/note";

// Re-export for backward compatibility
export type { ChatMessage } from "@/types/note";

/* ============================================
   ClarificationModal - AI 澄清对话框
   
   严格按照 Figma Page/Overlay/ClarificationModal 设计还原：
   - Panel/Container: 玻璃态容器 (bg-white/90, backdrop-blur-3xl)
   - Button/Pill/Clear: 蓝色清除按钮
   - List/ChatHistory: 对话气泡列表 (AI 左侧带灰线，User 黑底)
   - Bar/InputArea: 底部输入栏 (圆角边框 + 阴影)
   ============================================ */

interface ClarificationModalProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 对话历史 */
  history: ChatMessage[];
  /** 发送文本消息 */
  onSendText: (text: string) => void;
  /** 清除对话并关闭 */
  onClear: () => void;
}

// ==========================================
// 图标组件
// ==========================================

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 4H13M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4M12 4V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ==========================================
// 子组件：聊天气泡
// ==========================================

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAI = message.role === "ai";

  if (isAI) {
    // AI 气泡：白色背景 + 左侧蓝色竖线 + 阴影（参考 Figma）
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-start"
      >
        <div 
          className="
            flex max-w-[85%]
            bg-white 
            rounded-[16px] rounded-tl-[4px]
            shadow-[0_2px_8px_rgba(0,0,0,0.08)]
            border border-[#F0F0F0]
            overflow-hidden
          "
        >
          {/* 左侧蓝色竖线 */}
          <div className="w-[4px] bg-[#007AFF] shrink-0" />
          {/* 内容 */}
          <div className="px-3 py-3 text-[15px] leading-[22px] text-[#000000]">
            {message.content}
          </div>
        </div>
      </motion.div>
    );
  }

  // User 气泡：黑色背景 + 白色文字，右对齐
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-end"
    >
      <div
        className="
          max-w-[85%] px-4 py-3
          bg-[#000000] 
          rounded-[16px] rounded-tr-[4px]
          text-[15px] leading-[22px] text-white
        "
      >
        {message.content}
      </div>
    </motion.div>
  );
}

// ==========================================
// 主组件
// ==========================================

export default function ClarificationModal({
  isOpen,
  history,
  onSendText,
  onClear,
}: ClarificationModalProps) {
  const [inputText, setInputText] = useState("");
  const chatListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [history]);

  // 发送文本消息
  const handleSendText = useCallback(() => {
    if (!inputText.trim()) return;
    onSendText(inputText.trim());
    setInputText("");
  }, [inputText, onSendText]);

  // 键盘回车发送
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景蒙层 - 灰色半透明 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[45]"
            onClick={onClear}
          />

          {/* Panel/Container - 玻璃态容器 */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="
              fixed bottom-[21px] left-[16px] right-[16px]
              z-[50]
              flex flex-col
              max-h-[350px]
              bg-white/90 backdrop-blur-3xl
              rounded-[30px]
              shadow-[0_20px_50px_rgba(0,0,0,0.15)]
              overflow-hidden
            "
            style={{ paddingTop: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Button/Pill/Clear - 蓝色清除按钮 */}
            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={onClear}
                className="
                  flex items-center gap-1.5
                  px-3 py-1
                  text-[#007AFF] text-[13px] font-medium
                  hover:opacity-70
                  transition-opacity
                "
              >
                <TrashIcon />
                <span>清除</span>
              </button>
            </div>

            {/* List/ChatHistory - 对话列表 */}
            <div
              ref={chatListRef}
              className="flex-1 overflow-y-auto px-4 space-y-4"
              style={{ padding: "0 16px", paddingBottom: 8 }}
            >
              {history.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              
              {/* 空状态 */}
              {history.length === 0 && (
                <div className="flex items-center justify-center h-[80px] text-gray-400 text-sm">
                  开始对话...
                </div>
              )}
            </div>

            {/* Bar/InputArea - 底部输入栏 */}
            {/* 注意：右侧预留空间给全局 VoiceHUD 按钮 (62px + 16px padding) */}
            <div 
              className="
                flex items-center gap-3 
                ml-4 mr-[90px] mb-4 mt-2
                px-4 py-2
                bg-white/70
                border border-white/80
                rounded-[50px]
                shadow-[0_5px_20px_rgba(0,0,0,0.08)]
              "
            >
              {/* 左侧：+ 按钮 */}
              <button
                type="button"
                className="
                  w-8 h-8 shrink-0
                  flex items-center justify-center
                  text-[#000000]
                  transition-opacity hover:opacity-60
                "
              >
                <PlusIcon />
              </button>

              {/* 文本输入框 */}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="发消息或者语音"
                className="
                  flex-1
                  bg-transparent
                  text-[15px] text-[#000000]
                  placeholder-[#999999]
                  outline-none
                "
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}




