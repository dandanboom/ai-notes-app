/**
 * Note Store - Zustand State Management
 * 
 * Centralized state management for the note editor.
 * Handles:
 * - Block CRUD operations
 * - Undo/Redo history
 * - Review mode state
 * - Clarification dialog state
 * - Ghost text predictions
 * - UI state (focus, processing)
 * - Database synchronization (with optimistic updates)
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import * as Diff from "diff";
import type { AIResponse } from "@/types/ai";
import type { TextBlock, ReviewState, ChatMessage } from "@/types/note";
import { createTextBlock, parseMarkdownToBlocks, blocksToMarkdown } from "@/types/note";

// ============================================
// Threshold for Diff View
// ============================================

const DIFF_THRESHOLD = 10; // 变更字符数阈值：≤10 直接应用，>10 显示 Diff 视图

// ============================================
// Constants
// ============================================

const MAX_HISTORY_STEPS = 5;
const AUTO_SAVE_DELAY = 2000; // 2 seconds

// ============================================
// Store Interface
// ============================================

interface NoteState {
  // ===== Core Data =====
  blocks: TextBlock[];
  currentNotebookId: string | null;
  
  // ===== Sync State =====
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  
  // ===== History System (Undo/Redo) =====
  history: TextBlock[][];
  future: TextBlock[][];
  lastSavedSnapshot: string;
  
  // ===== Review Mode =====
  reviewState: ReviewState | null;
  
  // ===== Clarification Mode =====
  isClarifying: boolean;
  chatHistory: ChatMessage[];
  
  // ===== UI State =====
  isProcessing: boolean;
  focusedBlockId: string | null;
  forceEditBlockId: string | null;
  forceCursorPosition: number | undefined;
  ghostTexts: Record<string, string>;
  
  // ===== Computed Values =====
  getFullContent: () => string;
  getContextContent: () => string;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

interface NoteActions {
  // ===== Block CRUD =====
  setBlocks: (blocks: TextBlock[]) => void;
  addBlock: (content?: string) => void;
  updateBlock: (id: string, content: string) => void;
  insertBlockAfter: (afterId: string, content?: string) => void;
  deleteBlock: (id: string) => void;
  mergeWithPrevious: (id: string) => { previousBlockId: string; cursorPosition: number } | null;
  
  // ===== Notebook Management =====
  setCurrentNotebook: (notebookId: string | null) => void;
  loadNotebook: (notebookId: string, blocks: TextBlock[]) => void;
  
  // ===== Sync Actions =====
  setSyncing: (isSyncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  markSynced: () => void;
  
  // ===== History =====
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  
  // ===== Review Mode =====
  setReviewState: (state: ReviewState | null) => void;
  confirmReview: () => void;
  rejectReview: () => void;
  
  // ===== Clarification Mode =====
  setIsClarifying: (value: boolean) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  
  // ===== UI State =====
  setIsProcessing: (value: boolean) => void;
  setFocusedBlockId: (id: string | null) => void;
  setForceEdit: (blockId: string | null, cursorPosition?: number) => void;
  clearForceEdit: () => void;
  setGhostText: (blockId: string, text: string) => void;
  clearGhostText: (blockId: string) => void;
  
  // ===== Complex Actions =====
  handleAppendContent: (content: string) => void;
  handleBlockAIResponse: (blockId: string, response: AIResponse) => void;
  handleGlobalAIResponse: (response: AIResponse) => void;
  
  // ===== Reset =====
  reset: () => void;
}

type NoteStore = NoteState & NoteActions;

// ============================================
// Initial State
// ============================================

const initialState: Omit<NoteState, 'getFullContent' | 'getContextContent' | 'canUndo' | 'canRedo'> = {
  blocks: [createTextBlock("")],
  currentNotebookId: null,
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
  history: [],
  future: [],
  lastSavedSnapshot: "",
  reviewState: null,
  isClarifying: false,
  chatHistory: [],
  isProcessing: false,
  focusedBlockId: null,
  forceEditBlockId: null,
  forceCursorPosition: undefined,
  ghostTexts: {},
};

// ============================================
// Store Implementation
// ============================================

export const useNoteStore = create<NoteStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ===== Initial State =====
        ...initialState,

        // ===== Computed Values =====
        getFullContent: () => {
          return blocksToMarkdown(get().blocks);
        },
        
        getContextContent: () => {
          const { focusedBlockId, blocks } = get();
          if (focusedBlockId) {
            const block = blocks.find((b) => b.id === focusedBlockId);
            if (block && block.content.trim()) {
              return block.content;
            }
          }
          return blocksToMarkdown(blocks);
        },
        
        canUndo: () => get().history.length > 0,
        canRedo: () => get().future.length > 0,

        // ===== Block CRUD =====
        setBlocks: (blocks) => {
          set({ blocks }, false, "setBlocks");
        },

        addBlock: (content = "") => {
          const newBlock = createTextBlock(content);
          get().saveSnapshot();
          set(
            (state) => ({ blocks: [...state.blocks, newBlock] }),
            false,
            "addBlock"
          );
        },

        updateBlock: (id, content) => {
          set(
            (state) => ({
              blocks: state.blocks.map((block) =>
                block.id === id
                  ? { ...block, content, isEmpty: content.trim() === "" }
                  : block
              ),
            }),
            false,
            "updateBlock"
          );
        },

        insertBlockAfter: (afterId, content = "") => {
          set(
            (state) => {
              const index = state.blocks.findIndex((b) => b.id === afterId);
              if (index === -1) return state;

              const newBlock = createTextBlock(content);
              const newBlocks = [...state.blocks];
              newBlocks.splice(index + 1, 0, newBlock);

              return { blocks: newBlocks };
            },
            false,
            "insertBlockAfter"
          );
        },

        deleteBlock: (id) => {
          set(
            (state) => ({
              blocks: state.blocks.filter((b) => b.id !== id),
            }),
            false,
            "deleteBlock"
          );
        },

        mergeWithPrevious: (id) => {
          const { blocks, saveSnapshot, setForceEdit } = get();
          const index = blocks.findIndex((b) => b.id === id);
          
          if (index <= 0) return null;

          const previousBlock = blocks[index - 1];
          const currentBlock = blocks[index];
          const cursorPosition = previousBlock.content.length;
          const mergedContent = previousBlock.content + currentBlock.content;

          saveSnapshot();
          setForceEdit(previousBlock.id, cursorPosition);

          set(
            (state) => {
              const newBlocks = [...state.blocks];
              newBlocks[index - 1] = {
                ...previousBlock,
                content: mergedContent,
                isEmpty: mergedContent.trim() === "",
              };
              newBlocks.splice(index, 1);
              return { blocks: newBlocks };
            },
            false,
            "mergeWithPrevious"
          );

          return { previousBlockId: previousBlock.id, cursorPosition };
        },

        // ===== Notebook Management =====
        setCurrentNotebook: (notebookId) => {
          set({ currentNotebookId: notebookId }, false, "setCurrentNotebook");
        },

        loadNotebook: (notebookId, blocks) => {
          set(
            {
              currentNotebookId: notebookId,
              blocks: blocks.length > 0 ? blocks : [createTextBlock("")],
              history: [],
              future: [],
              lastSavedSnapshot: JSON.stringify(blocks),
              lastSyncedAt: Date.now(),
              syncError: null,
            },
            false,
            "loadNotebook"
          );
        },

        // ===== Sync Actions =====
        setSyncing: (isSyncing) => {
          set({ isSyncing }, false, "setSyncing");
        },

        setSyncError: (syncError) => {
          set({ syncError }, false, "setSyncError");
        },

        markSynced: () => {
          set({ lastSyncedAt: Date.now(), syncError: null }, false, "markSynced");
        },

        // ===== History =====
        saveSnapshot: () => {
          set(
            (state) => {
              const currentJson = JSON.stringify(state.blocks);
              if (currentJson === state.lastSavedSnapshot) return state;

              const newHistory = [...state.history, state.blocks];
              return {
                history: newHistory.length > MAX_HISTORY_STEPS
                  ? newHistory.slice(-MAX_HISTORY_STEPS)
                  : newHistory,
                future: [],
                lastSavedSnapshot: currentJson,
              };
            },
            false,
            "saveSnapshot"
          );
        },

        undo: () => {
          set(
            (state) => {
              if (state.history.length === 0) return state;

              const previousState = state.history[state.history.length - 1];
              const newHistory = state.history.slice(0, -1);

              return {
                blocks: previousState,
                history: newHistory,
                future: [...state.future, state.blocks],
                lastSavedSnapshot: JSON.stringify(previousState),
              };
            },
            false,
            "undo"
          );
        },

        redo: () => {
          set(
            (state) => {
              if (state.future.length === 0) return state;

              const nextState = state.future[state.future.length - 1];
              const newFuture = state.future.slice(0, -1);

              return {
                blocks: nextState,
                history: [...state.history, state.blocks],
                future: newFuture,
                lastSavedSnapshot: JSON.stringify(nextState),
              };
            },
            false,
            "redo"
          );
        },

        // ===== Review Mode =====
        setReviewState: (reviewState) => {
          set({ reviewState }, false, "setReviewState");
        },

        confirmReview: () => {
          const { reviewState, saveSnapshot } = get();
          if (!reviewState) return;

          saveSnapshot();

          if (reviewState.blockId === null) {
            const newBlocks = parseMarkdownToBlocks(reviewState.response.content);
            set({ blocks: newBlocks, reviewState: null }, false, "confirmReview");
          } else {
            set(
              (state) => ({
                blocks: state.blocks.map((block) =>
                  block.id === reviewState.blockId
                    ? {
                        ...block,
                        content: reviewState.response.content,
                        isEmpty: reviewState.response.content.trim() === "",
                      }
                    : block
                ),
                reviewState: null,
              }),
              false,
              "confirmReview"
            );
          }
        },

        rejectReview: () => {
          set({ reviewState: null }, false, "rejectReview");
        },

        // ===== Clarification Mode =====
        setIsClarifying: (isClarifying) => {
          set({ isClarifying }, false, "setIsClarifying");
        },

        addChatMessage: (message) => {
          set(
            (state) => ({ chatHistory: [...state.chatHistory, message] }),
            false,
            "addChatMessage"
          );
        },

        clearChatHistory: () => {
          set({ chatHistory: [], isClarifying: false }, false, "clearChatHistory");
        },

        // ===== UI State =====
        setIsProcessing: (isProcessing) => {
          set({ isProcessing }, false, "setIsProcessing");
        },

        setFocusedBlockId: (focusedBlockId) => {
          set({ focusedBlockId }, false, "setFocusedBlockId");
        },

        setForceEdit: (forceEditBlockId, forceCursorPosition) => {
          set({ forceEditBlockId, forceCursorPosition }, false, "setForceEdit");
        },

        clearForceEdit: () => {
          set(
            { forceEditBlockId: null, forceCursorPosition: undefined },
            false,
            "clearForceEdit"
          );
        },

        setGhostText: (blockId, text) => {
          set(
            (state) => ({
              ghostTexts: { ...state.ghostTexts, [blockId]: text },
            }),
            false,
            "setGhostText"
          );
        },

        clearGhostText: (blockId) => {
          set(
            (state) => {
              const newGhostTexts = { ...state.ghostTexts };
              delete newGhostTexts[blockId];
              return { ghostTexts: newGhostTexts };
            },
            false,
            "clearGhostText"
          );
        },

        // ===== Complex Actions =====
        handleAppendContent: (content) => {
          if (!content) return;
          
          const newBlocks = parseMarkdownToBlocks(content);
          set(
            (state) => ({ blocks: [...state.blocks, ...newBlocks] }),
            false,
            "handleAppendContent"
          );
        },

        handleBlockAIResponse: (blockId, response) => {
          const { blocks, saveSnapshot, setReviewState, updateBlock } = get();
          const currentBlock = blocks.find((b) => b.id === blockId);
          
          if (!currentBlock) return;

          // ===== review_immediate：后端已判断为小修改，直接应用 =====
          if (response.type === "review_immediate") {
            console.log(`✅ [Store] review_immediate: 直接应用修改`);
            saveSnapshot();
            updateBlock(blockId, response.content);
            return;
          }

          // ===== review：计算 Diff，决定是直接应用还是显示 Diff 视图 =====
          if (response.type === "review") {
            // 计算字符差异
            const changes = Diff.diffChars(currentBlock.content, response.content);
            let diffCount = 0;
            changes.forEach(part => {
              if (part.added || part.removed) {
                diffCount += part.value.length;
              }
            });
            
            console.log(`📊 [Store] 变更字符数: ${diffCount}`);

            if (diffCount > DIFF_THRESHOLD) {
              // 大修改：触发 Diff 视图 (Review Mode)
              console.log(`🔍 [Store] 大修改 (${diffCount}字)，触发 Diff 视图`);
              saveSnapshot();
              setReviewState({
                blockId,
                response,
                originalContent: currentBlock.content,
              });
            } else {
              // 小修改：直接应用（如同 Append 行为，但其实是替换）
              console.log(`✅ [Store] 小修改 (${diffCount}字)，直接应用`);
              saveSnapshot();
              updateBlock(blockId, response.content);
            }
            return;
          }

          // ===== append：直接更新 Block 内容（行内编辑模式下 AI 返回的是全文） =====
          if (response.type === "append") {
            console.log(`➕ [Store] append: 更新 Block 内容`);
            saveSnapshot();
            updateBlock(blockId, response.content);
          }
        },

        handleGlobalAIResponse: (response) => {
          const { 
            focusedBlockId, 
            blocks, 
            saveSnapshot, 
            chatHistory,
            isClarifying,
            getFullContent,
          } = get();

          const userMessage = response.userInput || "(语音输入)";

          if (response.type === "inquire") {
            const newHistory: ChatMessage[] = [
              ...chatHistory,
              {
                id: `user-${Date.now()}`,
                role: "user",
                content: userMessage,
                timestamp: Date.now(),
              },
              {
                id: `ai-${Date.now() + 1}`,
                role: "ai",
                content: response.content,
                timestamp: Date.now() + 1,
              },
            ];
            
            set(
              { chatHistory: newHistory, isClarifying: true },
              false,
              "handleGlobalAIResponse:inquire"
            );
            return;
          }

          if (isClarifying) {
            set(
              { isClarifying: false, chatHistory: [] },
              false,
              "handleGlobalAIResponse:closeClarification"
            );
          }

          if (focusedBlockId) {
            const targetBlock = blocks.find((b) => b.id === focusedBlockId);
            if (!targetBlock) return;

            saveSnapshot();

            if (response.type === "append") {
              const newContent = targetBlock.content.trim()
                ? targetBlock.content + "\n\n" + response.content
                : response.content;

              set(
                (state) => ({
                  blocks: state.blocks.map((block) =>
                    block.id === focusedBlockId
                      ? { ...block, content: newContent, isEmpty: newContent.trim() === "" }
                      : block
                  ),
                  focusedBlockId: null,
                }),
                false,
                "handleGlobalAIResponse:inlineAppend"
              );
            } else if (response.type === "review") {
              set(
                (state) => ({
                  blocks: state.blocks.map((block) =>
                    block.id === focusedBlockId
                      ? { ...block, content: response.content, isEmpty: response.content.trim() === "" }
                      : block
                  ),
                  focusedBlockId: null,
                }),
                false,
                "handleGlobalAIResponse:inlineReview"
              );
            }
            return;
          }

          if (response.type === "append" && response.content) {
            const newBlocks = parseMarkdownToBlocks(response.content);
            set(
              (state) => ({ blocks: [...state.blocks, ...newBlocks] }),
              false,
              "handleGlobalAIResponse:globalAppend"
            );
          } else if (response.type === "review") {
            set(
              {
                reviewState: {
                  blockId: null,
                  response,
                  originalContent: getFullContent(),
                },
              },
              false,
              "handleGlobalAIResponse:globalReview"
            );
          }
        },

        // ===== Reset =====
        reset: () => {
          set(initialState, false, "reset");
        },
      }),
      {
        name: "ai-notes-storage",
        partialize: (state) => ({
          blocks: state.blocks,
          currentNotebookId: state.currentNotebookId,
        }),
      }
    ),
    { name: "note-store" }
  )
);

// ============================================
// Selector Hooks
// ============================================

export const useBlocks = () => useNoteStore((state) => state.blocks);
export const useIsProcessing = () => useNoteStore((state) => state.isProcessing);
export const useReviewState = () => useNoteStore((state) => state.reviewState);
export const useIsClarifying = () => useNoteStore((state) => state.isClarifying);
export const useChatHistory = () => useNoteStore((state) => state.chatHistory);
export const useGhostTexts = () => useNoteStore((state) => state.ghostTexts);
export const useIsSyncing = () => useNoteStore((state) => state.isSyncing);
export const useSyncError = () => useNoteStore((state) => state.syncError);



