"use server";

/**
 * Note Server Actions
 * 
 * 提供给客户端调用的笔记操作接口
 * 包含认证检查和错误处理
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import * as noteService from "@/services/noteService";
import type { TextBlock } from "@/types/note";

// ============================================
// 类型定义
// ============================================

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================
// 辅助函数
// ============================================

/**
 * 获取当前登录用户
 */
async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * 将数据库 Note 转换为客户端 TextBlock
 */
function noteToTextBlock(note: { id: string; content: string; isEmpty: boolean }): TextBlock {
  return {
    id: note.id,
    content: note.content,
    isEmpty: note.isEmpty,
  };
}

// ============================================
// Notebook Actions
// ============================================

/**
 * 获取用户的所有笔记本（包含预览）
 */
export async function getNotebooks(): Promise<ActionResult<Awaited<ReturnType<typeof noteService.getNotebooksWithPreview>>>> {
  try {
    // 检查数据库是否可用
    if (!noteService.checkDatabaseAvailable()) {
      console.log("⚠️ [getNotebooks] 数据库不可用，返回空列表");
      return { success: true, data: [] };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "请先登录" };
    }

    console.log("📚 [getNotebooks] 获取用户笔记本:", user.id);

    // 确保用户配置存在
    const userProfile = await noteService.getOrCreateUserProfile(
      user.id,
      user.email ?? undefined,
      user.user_metadata?.name || user.user_metadata?.full_name
    );

    const notebooks = await noteService.getNotebooksWithPreview(userProfile.id);
    console.log("✅ [getNotebooks] 找到笔记本数量:", notebooks.length);
    
    return { success: true, data: notebooks };
  } catch (error) {
    console.error("❌ [getNotebooks] 获取笔记本失败:", error);
    const errorMessage = error instanceof Error ? error.message : "获取笔记本失败";
    return { success: false, error: errorMessage };
  }
}

/**
 * 创建新笔记本
 */
export async function createNotebook(title?: string): Promise<ActionResult<Awaited<ReturnType<typeof noteService.createNotebook>>>> {
  try {
    // 检查数据库是否可用
    if (!noteService.checkDatabaseAvailable()) {
      console.error("❌ [createNotebook] 数据库不可用");
      return { success: false, error: "数据库未配置，请使用本地模式" };
    }

    const user = await getCurrentUser();
    if (!user) {
      console.error("❌ [createNotebook] 用户未登录");
      return { success: false, error: "请先登录" };
    }

    console.log("📝 [createNotebook] 用户信息:", {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.user_metadata?.full_name,
    });

    // 获取或创建 UserProfile
    const userProfile = await noteService.getOrCreateUserProfile(
      user.id,
      user.email ?? undefined,
      user.user_metadata?.name || user.user_metadata?.full_name
    );

    console.log("✅ [createNotebook] UserProfile:", {
      profileId: userProfile.id,
      authId: userProfile.authId,
    });

    // 创建笔记本
    const notebook = await noteService.createNotebook({
      userId: userProfile.id,
      title,
    });

    console.log("✅ [createNotebook] 创建成功:", notebook.id);

    revalidatePath("/");
    return { success: true, data: notebook };
  } catch (error) {
    console.error("❌ [createNotebook] 创建笔记本失败:", error);
    
    // 返回更详细的错误信息
    const errorMessage = error instanceof Error ? error.message : "创建笔记本失败";
    return { success: false, error: errorMessage };
  }
}

/**
 * 获取笔记本内容（包含所有笔记）
 * 优化：并行获取用户和笔记本数据
 */
export async function getNotebookContent(notebookId: string): Promise<ActionResult<TextBlock[]>> {
  try {
    // 并行执行，减少等待时间
    const [user, notebook] = await Promise.all([
      getCurrentUser(),
      noteService.getNotebookWithNotes(notebookId)
    ]);

    if (!user) {
      return { success: false, error: "请先登录" };
    }

    if (!notebook) {
      return { success: false, error: "笔记本不存在" };
    }

    const blocks = notebook.notes.map(noteToTextBlock);
    return { success: true, data: blocks };
  } catch (error) {
    console.error("获取笔记本内容失败:", error);
    return { success: false, error: "获取笔记本内容失败" };
  }
}

/**
 * 更新笔记本标题
 */
export async function updateNotebookTitle(
  notebookId: string,
  title: string
): Promise<ActionResult<void>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "请先登录" };
    }

    await noteService.updateNotebook(notebookId, { title });
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("更新笔记本标题失败:", error);
    return { success: false, error: "更新笔记本标题失败" };
  }
}

/**
 * 删除笔记本
 */
export async function deleteNotebook(notebookId: string): Promise<ActionResult<void>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "请先登录" };
    }

    await noteService.deleteNotebook(notebookId);
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("删除笔记本失败:", error);
    return { success: false, error: "删除笔记本失败" };
  }
}

// ============================================
// Note Actions
// ============================================

/**
 * 添加新笔记块
 */
export async function addNote(
  notebookId: string,
  content: string,
  afterOrder?: number
): Promise<ActionResult<TextBlock>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "请先登录" };
    }

    const note = await noteService.createNote({
      notebookId,
      content,
      order: afterOrder !== undefined ? afterOrder + 1 : undefined,
    });

    return { success: true, data: noteToTextBlock(note) };
  } catch (error) {
    console.error("添加笔记失败:", error);
    return { success: false, error: "添加笔记失败" };
  }
}

/**
 * 更新笔记内容
 */
export async function updateNote(
  noteId: string,
  content: string
): Promise<ActionResult<TextBlock>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "请先登录" };
    }

    const note = await noteService.updateNote(noteId, { content });
    return { success: true, data: noteToTextBlock(note) };
  } catch (error) {
    console.error("更新笔记失败:", error);
    return { success: false, error: "更新笔记失败" };
  }
}

/**
 * 删除笔记
 */
export async function deleteNote(noteId: string): Promise<ActionResult<void>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "请先登录" };
    }

    await noteService.deleteNote(noteId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("删除笔记失败:", error);
    return { success: false, error: "删除笔记失败" };
  }
}

/**
 * 同步所有笔记块（批量更新）
 * 
 * 用于将客户端的 blocks 状态同步到数据库
 * 采用乐观更新策略：客户端先更新 UI，然后后台同步
 */
export async function syncNotes(
  notebookId: string,
  blocks: TextBlock[]
): Promise<ActionResult<TextBlock[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "请先登录" };
    }

    // 使用批量创建（会先删除现有笔记）
    const notes = await noteService.batchCreateNotes(
      notebookId,
      blocks.map((block) => ({ content: block.content }))
    );

    return { success: true, data: notes.map(noteToTextBlock) };
  } catch (error) {
    console.error("同步笔记失败:", error);
    return { success: false, error: "同步笔记失败" };
  }
}

/**
 * 自动保存单个笔记（防抖后调用）
 */
export async function autoSaveNote(
  noteId: string,
  content: string
): Promise<ActionResult<void>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "请先登录" };
    }

    await noteService.updateNote(noteId, { content });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("自动保存失败:", error);
    return { success: false, error: "自动保存失败" };
  }
}

