"use client";

/**
 * useAutoSave - 自动保存 Hook
 * 
 * 监听 blocks 变化，自动同步到数据库
 * 使用防抖避免频繁请求
 */

import { useEffect, useRef, useCallback } from "react";
import { useNoteStore } from "@/store/noteStore";
import { syncNotes } from "@/app/actions/noteActions";

const AUTO_SAVE_DELAY = 2000; // 2 seconds

export function useAutoSave() {
  const {
    blocks,
    currentNotebookId,
    setSyncing,
    setSyncError,
    markSynced,
  } = useNoteStore();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedRef = useRef<string>("");

  const saveToDatabase = useCallback(async () => {
    if (!currentNotebookId) {
      console.log("📝 [AutoSave] 没有当前笔记本，跳过保存");
      return;
    }

    // 本地模式笔记本，跳过云端同步
    if (currentNotebookId.startsWith("local-")) {
      console.log("📝 [AutoSave] 本地模式，跳过云端同步");
      // 本地模式使用 localStorage 保存
      try {
        localStorage.setItem(`notebook-${currentNotebookId}`, JSON.stringify(blocks));
        markSynced();
        console.log("✅ [AutoSave] 本地保存成功");
      } catch (e) {
        console.error("❌ [AutoSave] 本地保存失败:", e);
      }
      return;
    }

    const currentJson = JSON.stringify(blocks);
    if (currentJson === lastSyncedRef.current) {
      console.log("📝 [AutoSave] 内容无变化，跳过保存");
      return;
    }

    console.log("📝 [AutoSave] 开始保存到数据库...");
    setSyncing(true);
    setSyncError(null);

    try {
      const result = await syncNotes(currentNotebookId, blocks);
      
      if (result.success) {
        lastSyncedRef.current = currentJson;
        markSynced();
        console.log("✅ [AutoSave] 保存成功");
      } else {
        setSyncError(result.error);
        console.error("❌ [AutoSave] 保存失败:", result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败";
      setSyncError(message);
      console.error("❌ [AutoSave] 保存异常:", error);
    } finally {
      setSyncing(false);
    }
  }, [blocks, currentNotebookId, setSyncing, setSyncError, markSynced]);

  // 监听 blocks 变化，防抖保存
  useEffect(() => {
    if (!currentNotebookId) return;

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(() => {
      saveToDatabase();
    }, AUTO_SAVE_DELAY);

    // 清理
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [blocks, currentNotebookId, saveToDatabase]);

  // 页面卸载前保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentNotebookId) {
        // 使用 sendBeacon 进行可靠的页面卸载保存
        // 注意：这里简化处理，实际可能需要更复杂的逻辑
        console.log("📝 [AutoSave] 页面卸载，尝试保存...");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentNotebookId]);

  return {
    saveNow: saveToDatabase,
  };
}

