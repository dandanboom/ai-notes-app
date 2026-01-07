"use server";

/**
 * Note Server Actions
 * 
 * 薄壳层：只负责认证和调用 Service
 * 所有业务逻辑都在 Service 层
 * 
 * 架构：Server Action -> AuthService -> NoteService -> Database
 */

import { revalidatePath } from "next/cache";
import * as authService from "@/services/authService";
import * as noteService from "@/services/noteService";
import type { TextBlock } from "@/types/note";

// ============================================
// 类型定义
// ============================================

type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================
// 工具函数
// ============================================

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
  // 1. 检查数据库
  if (!noteService.checkDatabaseAvailable()) {
    return { success: true, data: [] };
  }

  // 2. 认证
  const auth = await authService.requireAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    // 3. 确保用户配置存在
    const userProfile = await noteService.getOrCreateUserProfile(
      auth.data.id,
      auth.data.email,
      auth.data.name
    );

    // 4. 调用 Service
    const notebooks = await noteService.getNotebooksWithPreview(userProfile.id);
    
    return { success: true, data: notebooks };
  } catch (error) {
    console.error("❌ [noteActions] getNotebooks:", error);
    return { success: false, error: "获取笔记本失败" };
  }
}

/**
 * 创建新笔记本
 */
export async function createNotebook(title?: string): Promise<ActionResult<Awaited<ReturnType<typeof noteService.createNotebook>>>> {
  // 1. 检查数据库
  if (!noteService.checkDatabaseAvailable()) {
    return { success: false, error: "数据库未配置" };
  }

  // 2. 认证
  const auth = await authService.requireAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    // 3. 确保用户配置存在
    const userProfile = await noteService.getOrCreateUserProfile(
      auth.data.id,
      auth.data.email,
      auth.data.name
    );

    // 4. 调用 Service
    const notebook = await noteService.createNotebook({
      userId: userProfile.id,
      title,
    });

    revalidatePath("/");
    return { success: true, data: notebook };
  } catch (error) {
    console.error("❌ [noteActions] createNotebook:", error);
    return { success: false, error: "创建笔记本失败" };
  }
}

/**
 * 获取笔记本内容（包含所有笔记）
 */
export async function getNotebookContent(notebookId: string): Promise<ActionResult<TextBlock[]>> {
  // 1. 认证
  const auth = await authService.requireAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    // 2. 调用 Service
    const notebook = await noteService.getNotebookWithNotes(notebookId);
    
    if (!notebook) {
      return { success: false, error: "笔记本不存在" };
    }

    // 3. 转换格式
    const blocks = notebook.notes.map(noteToTextBlock);
    return { success: true, data: blocks };
  } catch (error) {
    console.error("❌ [noteActions] getNotebookContent:", error);
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
  // 1. 认证
  const auth = await authService.requireAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    // 2. 调用 Service
    await noteService.updateNotebook(notebookId, { title });
    
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("❌ [noteActions] updateNotebookTitle:", error);
    return { success: false, error: "更新笔记本标题失败" };
  }
}

/**
 * 删除笔记本
 */
export async function deleteNotebook(notebookId: string): Promise<ActionResult<void>> {
  // 1. 认证
  const auth = await authService.requireAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    // 2. 调用 Service
    await noteService.deleteNotebook(notebookId);
    
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("❌ [noteActions] deleteNotebook:", error);
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
  // 1. 认证
  const auth = await authService.requireAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    // 2. 调用 Service
    const note = await noteService.createNote({
      notebookId,
      content,
      order: afterOrder !== undefined ? afterOrder + 1 : undefined,
    });

    return { success: true, data: noteToTextBlock(note) };
  } catch (error) {
    console.error("❌ [noteActions] addNote:", error);
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
  // 1. 认证
  const auth = await authService.requireAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    // 2. 调用 Service
    const note = await noteService.updateNote(noteId, { content });
    
    return { success: true, data: noteToTextBlock(note) };
  } catch (error) {
    console.error("❌ [noteActions] updateNote:", error);
    return { success: false, error: "更新笔记失败" };
  }
}

/**
 * 删除笔记
 */
export async function deleteNote(noteId: string): Promise<ActionResult<void>> {
  // 1. 认证
  const auth = await authService.requireAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    // 2. 调用 Service
    await noteService.deleteNote(noteId);
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error("❌ [noteActions] deleteNote:", error);
    return { success: false, error: "删除笔记失败" };
  }
}

/**
 * 同步所有笔记块（批量更新）
 */
export async function syncNotes(
  notebookId: string,
  blocks: TextBlock[]
): Promise<ActionResult<TextBlock[]>> {
  // 1. 认证
  const auth = await authService.requireAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    // 2. 调用 Service
    const notes = await noteService.batchCreateNotes(
      notebookId,
      blocks.map((block) => ({ content: block.content }))
    );

    return { success: true, data: notes.map(noteToTextBlock) };
  } catch (error) {
    console.error("❌ [noteActions] syncNotes:", error);
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
  // 1. 认证
  const auth = await authService.requireAuth();
  if (!auth.success) {
    return { success: false, error: auth.error };
  }

  try {
    // 2. 调用 Service
    await noteService.updateNote(noteId, { content });
    
    return { success: true, data: undefined };
  } catch (error) {
    console.error("❌ [noteActions] autoSaveNote:", error);
    return { success: false, error: "自动保存失败" };
  }
}

