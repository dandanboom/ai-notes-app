"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
// @ts-ignore
import TextareaAutosize from "react-textarea-autosize";
// @ts-ignore
import ReactMarkdown from "react-markdown";
import { useRecorder } from "@/hooks/useRecorder";
import { InlineVoicePanel } from "./InlineVoicePanel";
import type { AIResponse } from "@/types/ai";
import type { TextBlock } from "@/types/note";

// Re-export for backward compatibility
export type { TextBlock } from "@/types/note";

interface EditorBlockProps {
  block: TextBlock;
  /** 编辑内容回调 */
  onEdit: (id: string, newContent: string) => void;
  /** AI 响应回调（用于触发 Review Mode） */
  onAIResponse?: (blockId: string, response: AIResponse) => void;
  /** 在当前块后插入新块 */
  onInsertAfter?: (id: string, newContent: string) => void;
  /** 合并到上一块（Backspace 跨块删除） */
  onMergeWithPrevious?: (id: string) => { previousBlockId: string; cursorPosition: number } | null;
  /** 是否是第一个块 */
  isFirstBlock?: boolean;
  /** 是否处于 Review 模式（用于 dimming 效果） */
  isDimmed?: boolean;
  /** 是否正在 Review 此块 */
  isReviewing?: boolean;
  /** 是否强制进入编辑模式（用于合并后保持键盘） */
  forceEditMode?: boolean;
  /** 强制聚焦时的光标位置 */
  forceCursorPosition?: number;
  /** 清除强制编辑状态的回调 */
  onClearForceEdit?: () => void;
  /** 聚焦回调（用于行内语音编辑） */
  onFocus?: (blockId: string) => void;
  /** 失焦回调 */
  onBlur?: (blockId: string) => void;
  /** Ghost Text (智能续写) */
  ghostText?: string | null;
  /** Ghost Text 采纳回调 */
  onAcceptGhostText?: (blockId: string) => void;
  /** 请求 Ghost Text 预测（打字停顿后触发） */
  onRequestGhostText?: (blockId: string, content: string) => void;
}

/**
 * EditorBlock - View/Edit 混合渲染组件
 * 
 * 核心功能：
 * - 默认 View 模式：使用 ReactMarkdown 渲染 Markdown 样式
 * - 点击进入 Edit 模式：切换为 TextareaAutosize 编辑源码
 * - 失焦自动切回 View 模式
 * - 侧边语音按钮：长按录音，传递当前块内容作为上下文
 */
export const EditorBlock: React.FC<EditorBlockProps> = ({
  block,
  onEdit,
  onAIResponse,
  onInsertAfter,
  onMergeWithPrevious,
  isFirstBlock = false,
  isDimmed = false,
  isReviewing = false,
  forceEditMode = false,
  forceCursorPosition,
  onClearForceEdit,
  onFocus,
  onBlur,
  ghostText: externalGhostText,
  onAcceptGhostText,
  onRequestGhostText,
}) => {
  // View/Edit 模式状态
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(block.content);
  
  // Ghost Text 状态（外部传入，但本地也管理以支持自动消失）
  const [ghostText, setGhostText] = useState<string | null>(null);
  const ghostTextTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 打字 debounce 触发 Ghost Text 预测
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const TYPING_DEBOUNCE_MS = 500;
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 手势追踪（用于左滑取消）
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // 🔑 计算文本修改的字符差异数
  const calculateCharDiff = (oldText: string, newText: string): number => {
    // 简单计算：取较长文本长度减去公共前缀和后缀的长度
    const maxLen = Math.max(oldText.length, newText.length);
    let commonPrefix = 0;
    let commonSuffix = 0;
    
    // 计算公共前缀
    while (commonPrefix < oldText.length && 
           commonPrefix < newText.length && 
           oldText[commonPrefix] === newText[commonPrefix]) {
      commonPrefix++;
    }
    
    // 计算公共后缀（避免与前缀重叠）
    while (commonSuffix < oldText.length - commonPrefix && 
           commonSuffix < newText.length - commonPrefix && 
           oldText[oldText.length - 1 - commonSuffix] === newText[newText.length - 1 - commonSuffix]) {
      commonSuffix++;
    }
    
    // 差异字符数 = 总长度 - 公共部分
    return maxLen - commonPrefix - commonSuffix;
  };

  // 录音逻辑 - 传递当前块内容作为上下文
  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    errorMessage,
  } = useRecorder({
    contextContent: block.content, // 🔑 关键：传递当前块内容作为上下文
    onAIResponse: (response) => {
      console.log(`🤖 [EditorBlock] 收到 AI 响应:`, response.type, response.userInput);
      console.log(`📄 [EditorBlock] 响应内容:`, response.content?.substring(0, 100));
      
      if (response.type === "append") {
        // ===== 追加模式：直接追加到当前块末尾 =====
        const newContent = localContent.trim() 
          ? localContent + "\n\n" + response.content 
          : response.content;
        console.log(`➕ [EditorBlock] 追加内容，新长度:`, newContent.length);
        setLocalContent(newContent);
        onEdit(block.id, newContent);
        
        // 👻 通知父组件触发 Ghost Text 预测
        onAIResponse?.(block.id, { ...response, content: newContent });
        
      } else if (response.type === "review_immediate") {
        // ===== 小修改模式（后端已判断 ≤10字）：直接应用 =====
        console.log(`✅ [EditorBlock] review_immediate: 直接应用修改`);
        setLocalContent(response.content);
        onEdit(block.id, response.content);
        
      } else if (response.type === "review") {
        // ===== 大修改模式：触发 Diff 视图 =====
        console.log(`🔍 [EditorBlock] review: 触发 Diff 视图`);
        onAIResponse?.(block.id, response);
        
      } else if (response.type === "inquire") {
        // ===== 追问模式：行内编辑不应该收到，转为追加处理 =====
        console.warn(`⚠️ [EditorBlock] 行内编辑收到 inquire，转为 append 处理`);
        
        // 将 AI 想说的内容作为新内容追加（而不是作为问题）
        // 因为在行内模式下，用户期望的是编辑结果，不是对话
        if (response.content && response.content.length > 10) {
          const newContent = localContent.trim() 
            ? localContent + "\n\n" + response.content 
            : response.content;
          setLocalContent(newContent);
          onEdit(block.id, newContent);
        } else {
          // 如果内容太短（可能真的只是个问题），保持原内容不变
          console.log(`⚠️ [EditorBlock] inquire 内容太短，保持原内容`);
        }
      }
    },
    onTranscription: (text) => {
      // 兼容纯文本模式
      const newContent = localContent.trim() 
        ? localContent + "\n\n" + text 
        : text;
      setLocalContent(newContent);
      onEdit(block.id, newContent);
    },
  });

  // 同步外部内容变化
  useEffect(() => {
    setLocalContent(block.content);
  }, [block.content]);

  // 同步外部 Ghost Text
  useEffect(() => {
    console.log(`👻 [EditorBlock] Block ${block.id} 收到外部 Ghost Text:`, externalGhostText || "(空)");
    if (externalGhostText) {
      setGhostText(externalGhostText);
    } else {
      setGhostText(null);
    }
  }, [externalGhostText, block.id]);

  // 采纳 Ghost Text
  const handleAcceptGhostText = useCallback(() => {
    if (ghostText) {
      const newContent = localContent + ghostText;
      setLocalContent(newContent);
      setGhostText(null);
      onEdit(block.id, newContent);
      onAcceptGhostText?.(block.id);
      
      // 移动光标到新内容末尾
      if (textareaRef.current) {
        setTimeout(() => {
          if (textareaRef.current) {
            const len = newContent.length;
            textareaRef.current.setSelectionRange(len, len);
          }
        }, 0);
      }
    }
  }, [ghostText, localContent, block.id, onEdit, onAcceptGhostText]);

  // 进入编辑模式后自动聚焦
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // 如果有指定光标位置，使用它；否则移动到末尾
      if (forceCursorPosition !== undefined) {
        textareaRef.current.setSelectionRange(forceCursorPosition, forceCursorPosition);
      } else {
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }
  }, [isEditing, forceCursorPosition]);

  // 处理强制编辑模式（合并块后保持键盘）
  useEffect(() => {
    if (forceEditMode && !isEditing) {
      setIsEditing(true);
      // 清除强制状态
      onClearForceEdit?.();
    }
  }, [forceEditMode, isEditing, onClearForceEdit]);

  // 清理 debounce 计时器
  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
    };
  }, []);

  // 处理内容变化
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    onEdit(block.id, newContent);
    
    // 用户输入时，清除现有 Ghost Text
    if (ghostText) {
      setGhostText(null);
    }
    
    // Debounce: 打字停顿 500ms 后请求 Ghost Text 预测
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }
    
    // 只有内容非空且有足够长度时才触发预测
    if (newContent.trim().length >= 10 && onRequestGhostText) {
      typingDebounceRef.current = setTimeout(() => {
        console.log(`👻 [EditorBlock] 触发打字后 Ghost Text 预测...`);
        onRequestGhostText(block.id, newContent);
      }, TYPING_DEBOUNCE_MS);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab: 采纳 Ghost Text
    if (e.key === "Tab" && ghostText) {
      e.preventDefault();
      handleAcceptGhostText();
      return;
    }

    // Enter: 创建新块
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // 如果有 Ghost Text，先清除
      if (ghostText) {
        setGhostText(null);
      }
      onInsertAfter?.(block.id, "");
      return;
    }

    // Backspace: 跨块删除（合并到上一块）
    if (e.key === "Backspace" && !isFirstBlock && onMergeWithPrevious) {
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
        e.preventDefault();
        // 执行合并（page.tsx 会处理聚焦逻辑）
        onMergeWithPrevious(block.id);
      }
    }

    // 光标移动时清除 Ghost Text
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") && ghostText) {
      setGhostText(null);
    }
  };

  // 切换到编辑模式
  const handleEnterEdit = useCallback(() => {
    if (!isDimmed && !isReviewing) {
      setIsEditing(true);
      // 通知父组件当前块被聚焦（用于行内语音编辑）
      onFocus?.(block.id);
      console.log(`📍 [EditorBlock] Block ${block.id} 进入编辑模式`);
    }
  }, [isDimmed, isReviewing, onFocus, block.id]);

  // 退出编辑模式
  const handleExitEdit = useCallback(() => {
    // 延迟退出，避免点击侧边按钮时立刻退出
    setTimeout(() => {
      if (!isRecording) {
        setIsEditing(false);
        // 通知父组件当前块失焦
        onBlur?.(block.id);
        console.log(`📍 [EditorBlock] Block ${block.id} 退出编辑模式`);
      }
    }, 150);
  }, [isRecording, onBlur, block.id]);

  // 侧边锚点触摸事件
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
      
      // 立即震动反馈
      if (navigator.vibrate) {
        navigator.vibrate(20);
      }

      // 缩短长按时间为 200ms，更快响应
      longPressTimerRef.current = setTimeout(() => {
        startRecording();
        longPressTimerRef.current = null;
      }, 200);
    },
    [startRecording]
  );

  const handleAnchorTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (longPressTimerRef.current) {
      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
      const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
      if (Math.sqrt(deltaX ** 2 + deltaY ** 2) > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      return;
    }

    if (isRecording) {
      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
      const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
      if (deltaX < -50 && Math.abs(deltaX) > deltaY) {
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

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        touchStartRef.current = null;
        return;
      }

      if (!touchStartRef.current) return;

      if (isRecording) {
        if (isCancelling) {
          stopRecording(true);
        } else {
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

  // 获取 Placeholder 文本
  const getPlaceholder = () => {
    if (isFirstBlock) {
      return "# 未命名";
    }
    return "";
  };

  // 渲染 Markdown 内容（View 模式）
  const renderMarkdown = () => {
    // 空内容时显示占位符
    if (!localContent.trim()) {
      if (isFirstBlock) {
        // 第一个块（标题）显示大标题格式的占位符
        return (
          <h1 className="text-[24px] font-semibold leading-[32px] text-gray-300 mb-2 mt-0 select-none">
            未命名
          </h1>
        );
      }
      // 其他块不显示占位符
      return <div className="min-h-[24px]" />;
    }

    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown
          components={{
            // 自定义标题样式
            h1: ({ children }) => (
              <h1 className="text-[24px] font-semibold leading-[32px] text-black mb-2 mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-[20px] font-semibold leading-[28px] text-black mb-2 mt-4">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-[17px] font-semibold leading-[24px] text-black mb-1 mt-3">
                {children}
              </h3>
            ),
            // 段落样式
            p: ({ children }) => (
              <p className="text-[15px] leading-[24px] text-[#282828] mb-2 mt-0">
                {children}
              </p>
            ),
            // 加粗
            strong: ({ children }) => (
              <strong className="font-semibold text-black">{children}</strong>
            ),
            // 列表
            ul: ({ children }) => (
              <ul className="list-disc list-inside text-[15px] leading-[24px] mb-2 pl-0">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside text-[15px] leading-[24px] mb-2 pl-0">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-[15px] leading-[24px] text-[#282828] mb-1">
                {children}
              </li>
            ),
          }}
        >
          {localContent}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      data-block-id={block.id}
      className={`relative group transition-opacity duration-200 ${
        isDimmed ? "opacity-20 pointer-events-none" : ""
      } ${isReviewing ? "ring-2 ring-blue-400 rounded-lg p-2 -mx-2" : ""}`}
    >
      <div className="relative flex items-start gap-2">
        {/* 内容区域：View/Edit 切换 */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            // Edit 模式：TextareaAutosize + Ghost Text
            <div className="relative w-full">
              <div className="relative flex items-start">
                <TextareaAutosize
                  ref={textareaRef}
                  value={localContent}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onBlur={handleExitEdit}
                  placeholder={getPlaceholder()}
                  className={`
                    flex-1
                    text-[15px] leading-[24px] font-normal
                    bg-transparent border-none outline-none
                    resize-none
                    focus:outline-none
                    p-0 m-0
                    transition-all duration-150
                    ${(isEditing || isRecording) ? "pr-10" : "pr-0"}
                  `}
                  style={{
                    fontFamily:
                      '"PingFang SC", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                />
                {/* Ghost Text - 紧跟在文本后面 */}
                {ghostText && (
                  <span
                    onClick={handleAcceptGhostText}
                    className="
                      inline-block
                      text-[15px] leading-[24px] font-normal
                      opacity-40 pointer-events-auto select-none
                      cursor-pointer
                      text-[#666666]
                      ml-0
                    "
                    style={{
                      fontFamily:
                        '"PingFang SC", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    }}
                  >
                    {ghostText}
                  </span>
                )}
              </div>
            </div>
          ) : (
            // View 模式：ReactMarkdown 渲染 + Ghost Text
            <div
              onClick={handleEnterEdit}
              className="cursor-text min-h-[24px]"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleEnterEdit();
                }
              }}
            >
              {renderMarkdown()}
              {/* 👻 Ghost Text - 在 View 模式下也显示 */}
              {ghostText && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAcceptGhostText();
                  }}
                  className="
                    inline
                    text-[15px] leading-[24px] font-normal
                    opacity-40 pointer-events-auto select-none
                    cursor-pointer
                    text-[#666666]
                    hover:opacity-60
                    transition-opacity
                  "
                  title="点击采纳"
                  style={{
                    fontFamily:
                      '"PingFang SC", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  }}
                >
                  {ghostText}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 侧边锚点（仅在编辑模式或录音时显示） */}
        <AnimatePresence>
          {(isEditing || isRecording) && (
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
                  transition-colors touch-none
                  ${isCancelling ? "bg-red-100" : "bg-[#E5E5E5] hover:bg-[#D0D0D0]"}
                  ${isRecording ? "bg-red-500 animate-pulse" : ""}
                `}
                style={{
                  touchAction: "none",
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                  boxShadow: isRecording 
                    ? "0 0 12px rgba(239, 68, 68, 0.5)" 
                    : "0 1px 2px rgba(0, 0, 0, 0.1)",
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className={`${isCancelling ? "text-red-500" : isRecording ? "text-white" : "text-[#666666]"}`}
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

      {/* 行内语音面板 */}
      <AnimatePresence>
        {isRecording && (
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
              onSend={() => stopRecording(false)}
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



