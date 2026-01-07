"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import NavigationBar from "@/components/NavigationBar";
import FloatingActionBar from "@/components/FloatingActionBar";
import VoiceHUD from "@/components/VoiceHUD";
import { EditorBlock } from "@/components/EditorBlock";
import { AIProcessingBar } from "@/components/AIProcessingBar";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewBlock } from "@/components/ReviewBlock";
import ClarificationModal from "@/components/ClarificationModal";
import type { AIResponse } from "@/types/ai";
import { processTextCommand, predictGhostText } from "@/app/actions";
import { getNotebookContent } from "@/app/actions/noteActions";
import { useNoteStore } from "@/store/noteStore";
import { useAutoSave } from "@/hooks/useAutoSave";

// Animation variants
const pageVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: "easeOut" as const },
  },
};

export default function NotebookPage() {
  const params = useParams();
  const notebookId = params.notebookId as string;

  // ===== Zustand Store =====
  const {
    blocks,
    history,
    future,
    reviewState,
    isClarifying,
    chatHistory,
    isProcessing,
    focusedBlockId,
    forceEditBlockId,
    forceCursorPosition,
    ghostTexts,
    currentNotebookId,
    // Actions
    updateBlock,
    insertBlockAfter,
    mergeWithPrevious,
    addBlock,
    undo,
    redo,
    saveSnapshot,
    clearForceEdit,
    setFocusedBlockId,
    setIsProcessing,
    setGhostText,
    clearGhostText,
    handleBlockAIResponse,
    handleGlobalAIResponse,
    confirmReview,
    rejectReview,
    addChatMessage,
    clearChatHistory,
    getContextContent,
    getFullContent,
    loadNotebook,
    setCurrentNotebook,
  } = useNoteStore();

  // ===== 从 URL 加载笔记本 =====
  useEffect(() => {
    async function loadNotebookData() {
      if (!notebookId || currentNotebookId === notebookId) {
        return;
      }

      console.log("📚 [NotebookPage] 加载笔记本:", notebookId);
      
      // 本地模式笔记本 (ID 以 "local-" 开头)，从 localStorage 加载
      if (notebookId.startsWith("local-")) {
        console.log("📚 [NotebookPage] 本地模式笔记本，从 localStorage 加载");
        try {
          const savedData = localStorage.getItem(`notebook-${notebookId}`);
          if (savedData) {
            const blocks = JSON.parse(savedData);
            loadNotebook(notebookId, blocks);
            console.log("✅ [NotebookPage] 本地笔记本加载成功，blocks:", blocks.length);
          } else {
            setCurrentNotebook(notebookId);
            console.log("📚 [NotebookPage] 新的本地笔记本");
          }
        } catch (e) {
          console.error("❌ [NotebookPage] 本地加载失败:", e);
          setCurrentNotebook(notebookId);
        }
        return;
      }
      
      try {
        const result = await getNotebookContent(notebookId);
        if (result.success) {
          loadNotebook(notebookId, result.data);
          console.log("✅ [NotebookPage] 笔记本加载成功，blocks:", result.data.length);
        } else {
          console.error("❌ [NotebookPage] 加载失败:", result.error);
          // 即使加载失败也设置 notebookId，允许创建新内容
          setCurrentNotebook(notebookId);
        }
      } catch (error) {
        console.error("❌ [NotebookPage] 加载异常:", error);
        setCurrentNotebook(notebookId);
      }
    }

    loadNotebookData();
  }, [notebookId, currentNotebookId, loadNotebook, setCurrentNotebook]);

  // ===== Auto Save =====
  useAutoSave();

  // ===== Computed Values =====
  const contextContent = useMemo(() => getContextContent(), [getContextContent, focusedBlockId, blocks]);
  const fullContextContent = useMemo(() => getFullContent(), [getFullContent, blocks]);

  // ===== Callbacks =====
  
  // Handle block content edit
  const handleBlockEdit = useCallback(
    (id: string, newContent: string) => {
      updateBlock(id, newContent);
    },
    [updateBlock]
  );

  // Handle block focus (for inline voice editing)
  const handleBlockFocus = useCallback(
    (blockId: string) => {
      console.log(`📍 [Page] Block ${blockId} 被聚焦`);
      setFocusedBlockId(blockId);
    },
    [setFocusedBlockId]
  );

  // Handle block blur
  const handleBlockBlur = useCallback(
    (blockId: string) => {
      console.log(`📍 [Page] Block ${blockId} 失焦`);
      // Delay clearing to avoid issues during recording
      setTimeout(() => {
        const currentFocused = useNoteStore.getState().focusedBlockId;
        if (currentFocused === blockId) {
          setFocusedBlockId(null);
        }
      }, 200);
    },
    [setFocusedBlockId]
  );

  // Trigger Ghost Text prediction
  const triggerGhostTextPrediction = useCallback(
    async (blockId: string, currentContent: string) => {
      try {
        console.log("👻 [Page] 触发 Ghost Text 预测，Block:", blockId, "内容长度:", currentContent.length);

        if (!currentContent || currentContent.trim().length < 5) {
          console.log("👻 [Page] 内容太短，跳过预测");
          return;
        }

        const predicted = await predictGhostText(currentContent);
        console.log("👻 [Page] 预测结果:", predicted || "(空)");

        if (predicted && predicted.trim()) {
          setGhostText(blockId, predicted);
          console.log("✅ [Page] Ghost Text 已设置到 Block:", blockId);
        } else {
          clearGhostText(blockId);
          console.log("👻 [Page] 预测结果为空，已清除 Ghost Text");
        }
      } catch (error) {
        console.error("❌ [Page] Ghost Text 预测失败:", error);
      }
    },
    [setGhostText, clearGhostText]
  );

  // Handle block AI response (from inline voice)
  const handleBlockAIResponseWithGhost = useCallback(
    (blockId: string, response: AIResponse) => {
      console.log(`🤖 [Page] 块 ${blockId} 收到 AI 响应:`, response.type);
      
      handleBlockAIResponse(blockId, response);
      
      // Trigger Ghost Text for append
      if (response.type === "append") {
        console.log(`👻 [Page] 触发 Ghost Text，内容长度:`, response.content.length);
        triggerGhostTextPrediction(blockId, response.content);
      }
    },
    [handleBlockAIResponse, triggerGhostTextPrediction]
  );

  // Handle global AI response (from bottom button)
  const handleGlobalAIResponseWithGhost = useCallback(
    (response: AIResponse) => {
      console.log("🤖 [Page] 收到 AI 响应:", response.type, "用户说:", response.userInput, "聚焦块:", focusedBlockId);
      
      handleGlobalAIResponse(response);
      
      // Trigger Ghost Text for append
      if (response.type === "append" && response.content) {
        // For global append, trigger on the last block
        const blocks = useNoteStore.getState().blocks;
        if (blocks.length > 0) {
          const lastBlock = blocks[blocks.length - 1];
          triggerGhostTextPrediction(lastBlock.id, lastBlock.content);
        }
      }
    },
    [handleGlobalAIResponse, focusedBlockId, triggerGhostTextPrediction]
  );

  // Handle clarification modal text send
  const handleClarificationSendText = useCallback(
    async (text: string) => {
      console.log("💬 [Page] 追问回复:", text);

      // Add user message
      addChatMessage({
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      });

      // Build history string
      const currentHistory = useNoteStore.getState().chatHistory;
      const historyStr = currentHistory
        .map((m) => `${m.role === "user" ? "用户" : "AI"}: ${m.content}`)
        .join("\n");

      setIsProcessing(true);
      try {
        const result = await processTextCommand(text, contextContent, historyStr);

        if (typeof result === "string") {
          console.error("❌ [Page] 追问处理失败:", result);
          addChatMessage({
            id: `ai-${Date.now()}`,
            role: "ai",
            content: `抱歉，处理失败: ${result}`,
            timestamp: Date.now(),
          });
        } else {
          handleGlobalAIResponseWithGhost(result);
        }
      } catch (error) {
        console.error("❌ [Page] 追问处理异常:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [addChatMessage, contextContent, handleGlobalAIResponseWithGhost, setIsProcessing]
  );

  // Legacy handler for transcription
  const handleTranscription = useCallback(
    (text: string) => {
      const { blocks, setBlocks } = useNoteStore.getState();
      const { parseMarkdownToBlocks } = require("@/types/note");
      const newBlocks = parseMarkdownToBlocks(text);
      useNoteStore.setState({ blocks: [...blocks, ...newBlocks] });
    },
    []
  );

  // Build chat history string for VoiceHUD
  const chatHistoryString = useMemo(() => {
    if (chatHistory.length === 0) return undefined;
    return chatHistory
      .map((m) => `${m.role === "user" ? "用户" : "AI"}: ${m.content}`)
      .join("\n");
  }, [chatHistory]);

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
        {/* Layer 1: Header (Fixed Height, No Scroll) */}
        <header className="flex-none z-50 bg-[#F5F5F7]">
          <NavigationBar notebookId={notebookId} />
        </header>

        {/* Layer 2: Content Area (占据剩余空间，独立滚动) */}
        <div className="flex-1 overflow-y-auto no-scrollbar z-10 overscroll-contain scrollable-content">
          <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            className="pt-6 pb-64 px-6 pr-14 article-content"
          >
            {/* Block Editor - View/Edit 混合渲染 */}
            <article className="bg-transparent text-[#000000] flex flex-col gap-2">
              {/* 全文 Review 模式：在顶部显示 Diff */}
              {reviewState && reviewState.blockId === null && (
                <div className="mb-4">
                  <ReviewBlock
                    originalContent={reviewState.originalContent}
                    newContent={reviewState.response.content}
                  />
                </div>
              )}

              {blocks.map((block, index) => {
                // 如果当前块正在 Review，显示 ReviewBlock
                const isCurrentBlockReviewing =
                  reviewState !== null && reviewState.blockId === block.id;

                if (isCurrentBlockReviewing) {
                  return (
                    <ReviewBlock
                      key={block.id}
                      originalContent={reviewState.originalContent}
                      newContent={reviewState.response.content}
                    />
                  );
                }

                // 否则显示普通 EditorBlock
                // 全文 Review 模式下所有块都变暗
                const shouldDim =
                  reviewState !== null &&
                  (reviewState.blockId === null ||
                    (reviewState.blockId !== null &&
                      reviewState.blockId !== block.id));

                return (
                  <EditorBlock
                    key={block.id}
                    block={block}
                    onEdit={handleBlockEdit}
                    onAIResponse={handleBlockAIResponseWithGhost}
                    onInsertAfter={insertBlockAfter}
                    onMergeWithPrevious={mergeWithPrevious}
                    isFirstBlock={index === 0}
                    isDimmed={shouldDim}
                    isReviewing={false}
                    forceEditMode={forceEditBlockId === block.id}
                    forceCursorPosition={
                      forceEditBlockId === block.id ? forceCursorPosition : undefined
                    }
                    onClearForceEdit={clearForceEdit}
                    onFocus={handleBlockFocus}
                    onBlur={handleBlockBlur}
                    ghostText={ghostTexts[block.id] || null}
                    onAcceptGhostText={clearGhostText}
                    onRequestGhostText={triggerGhostTextPrediction}
                  />
                );
              })}
            </article>
          </motion.div>
        </div>

        {/* Layer 3: Overlays (Pinned to Bottom, Floating above content) */}

        {/* Navigation/Action Bar Dock - 在 Clarification 或 Processing 模式下隐藏 */}
        <AnimatePresence>
          {!isClarifying && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none"
            >
              <FloatingActionBar
                onUndo={undo}
                onRedo={redo}
                onAdd={addBlock}
                canUndo={history.length > 0}
                canRedo={future.length > 0}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Processing Bar */}
        <AnimatePresence>
          {isProcessing && <AIProcessingBar />}
        </AnimatePresence>

        {/* VoiceHUD Overlay (Core Interaction) - 始终可用，浮在 Modal 上方 */}
        <div className="absolute bottom-0 left-0 right-0 z-[100] pointer-events-none">
          <VoiceHUD
            onAIResponse={handleGlobalAIResponseWithGhost}
            onTranscription={handleTranscription}
            onProcessing={setIsProcessing}
            contextContent={contextContent}
            chatHistory={chatHistoryString}
          />
        </div>

        {/* Review Mode 底部操作栏 */}
        <AnimatePresence>
          {reviewState && (
            <ReviewCard
              response={reviewState.response}
              originalContent={reviewState.originalContent}
              onConfirm={confirmReview}
              onReject={rejectReview}
            />
          )}
        </AnimatePresence>

        {/* Clarification Modal (AI 追问对话框) */}
        <ClarificationModal
          isOpen={isClarifying}
          history={chatHistory}
          onSendText={handleClarificationSendText}
          onClear={clearChatHistory}
        />
      </div>
    </main>
  );
}




