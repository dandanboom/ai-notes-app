/**
 * Note 数据库服务层
 * 
 * 封装所有与笔记相关的数据库操作
 * 使用 Prisma ORM 进行类型安全的数据库访问
 */

import { getPrisma, checkDatabaseAvailable } from "@/lib/prisma";
import type { Note, Notebook, NoteType } from "@prisma/client";

// 导出数据库可用性检查
export { checkDatabaseAvailable };

// ============================================
// 类型定义
// ============================================

export interface CreateNoteInput {
  notebookId: string;
  content: string;
  type?: NoteType;
  order?: number;
}

export interface UpdateNoteInput {
  content?: string;
  type?: NoteType;
  order?: number;
  isEmpty?: boolean;
}

export interface CreateNotebookInput {
  userId: string;
  title?: string;
  description?: string;
  emoji?: string;
}

// ============================================
// Notebook 操作
// ============================================

/**
 * 获取用户的所有笔记本
 */
export async function getNotebooksByUserId(userId: string): Promise<Notebook[]> {
  const prisma = getPrisma();
  return prisma.notebook.findMany({
    where: { userId, isArchived: false },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * 获取用户的所有笔记本（包含预览用的第一条笔记）
 */
export async function getNotebooksWithPreview(userId: string) {
  const prisma = getPrisma();
  return prisma.notebook.findMany({
    where: { userId, isArchived: false },
    orderBy: { updatedAt: "desc" },
    include: {
      notes: {
        take: 1,
        orderBy: { order: "asc" },
        select: { content: true },
      },
    },
  });
}

/**
 * 获取单个笔记本（包含笔记）
 */
export async function getNotebookWithNotes(notebookId: string) {
  const prisma = getPrisma();
  return prisma.notebook.findUnique({
    where: { id: notebookId },
    include: {
      notes: {
        orderBy: { order: "asc" },
      },
    },
  });
}

/**
 * 创建新笔记本
 */
export async function createNotebook(input: CreateNotebookInput): Promise<Notebook> {
  const prisma = getPrisma();
  return prisma.notebook.create({
    data: {
      userId: input.userId,
      title: input.title ?? "未命名笔记",
      description: input.description,
      emoji: input.emoji ?? "📝",
    },
  });
}

/**
 * 更新笔记本
 */
export async function updateNotebook(
  notebookId: string,
  data: Partial<Pick<Notebook, "title" | "description" | "emoji" | "isArchived">>
): Promise<Notebook> {
  const prisma = getPrisma();
  return prisma.notebook.update({
    where: { id: notebookId },
    data,
  });
}

/**
 * 删除笔记本（级联删除所有笔记）
 */
export async function deleteNotebook(notebookId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.notebook.delete({
    where: { id: notebookId },
  });
}

// ============================================
// Note 操作
// ============================================

/**
 * 获取笔记本中的所有笔记
 */
export async function getNotesByNotebookId(notebookId: string): Promise<Note[]> {
  const prisma = getPrisma();
  return prisma.note.findMany({
    where: { notebookId },
    orderBy: { order: "asc" },
  });
}

/**
 * 获取单个笔记
 */
export async function getNoteById(noteId: string): Promise<Note | null> {
  const prisma = getPrisma();
  return prisma.note.findUnique({
    where: { id: noteId },
  });
}

/**
 * 创建新笔记
 */
export async function createNote(input: CreateNoteInput): Promise<Note> {
  const prisma = getPrisma();
  // 如果没有指定 order，获取当前最大 order 值 +1
  let order = input.order;
  if (order === undefined) {
    const maxOrderNote = await prisma.note.findFirst({
      where: { notebookId: input.notebookId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    order = (maxOrderNote?.order ?? -1) + 1;
  }

  return prisma.note.create({
    data: {
      notebookId: input.notebookId,
      content: input.content,
      type: input.type ?? "PARAGRAPH",
      order,
      isEmpty: input.content.trim() === "",
    },
  });
}

/**
 * 更新笔记
 */
export async function updateNote(noteId: string, input: UpdateNoteInput): Promise<Note> {
  const prisma = getPrisma();
  const data: UpdateNoteInput = { ...input };
  
  // 如果更新了 content，自动更新 isEmpty
  if (input.content !== undefined) {
    data.isEmpty = input.content.trim() === "";
  }

  return prisma.note.update({
    where: { id: noteId },
    data,
  });
}

/**
 * 删除笔记
 */
export async function deleteNote(noteId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.note.delete({
    where: { id: noteId },
  });
}

/**
 * 批量更新笔记（用于重排序）
 */
export async function batchUpdateNotes(
  updates: Array<{ id: string; order: number }>
): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction(
    updates.map((update) =>
      prisma.note.update({
        where: { id: update.id },
        data: { order: update.order },
      })
    )
  );
}

/**
 * 批量创建笔记（用于导入或替换全部）
 */
export async function batchCreateNotes(
  notebookId: string,
  notes: Array<{ content: string; type?: NoteType }>
): Promise<Note[]> {
  const prisma = getPrisma();
  // 先删除现有笔记
  await prisma.note.deleteMany({
    where: { notebookId },
  });

  // 批量创建新笔记
  const createData = notes.map((note, index) => ({
    notebookId,
    content: note.content,
    type: note.type ?? ("PARAGRAPH" as NoteType),
    order: index,
    isEmpty: note.content.trim() === "",
  }));

  await prisma.note.createMany({
    data: createData,
  });

  // 返回新创建的笔记
  return prisma.note.findMany({
    where: { notebookId },
    orderBy: { order: "asc" },
  });
}

// ============================================
// UserProfile 操作
// ============================================

/**
 * 获取或创建用户配置
 * 当用户首次登录时调用
 */
export async function getOrCreateUserProfile(authId: string, email?: string, name?: string) {
  const prisma = getPrisma();
  return prisma.userProfile.upsert({
    where: { authId },
    update: {
      email,
      name,
    },
    create: {
      authId,
      email,
      name,
    },
  });
}

/**
 * 获取用户配置
 */
export async function getUserProfileByAuthId(authId: string) {
  const prisma = getPrisma();
  return prisma.userProfile.findUnique({
    where: { authId },
  });
}



