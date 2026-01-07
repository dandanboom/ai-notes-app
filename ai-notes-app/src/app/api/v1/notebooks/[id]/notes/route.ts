/**
 * Notes API
 * 
 * REST API 端点，供未来 React Native App 调用
 * 
 * GET  /api/v1/notebooks/[id]/notes  - 获取笔记本中的所有笔记
 * POST /api/v1/notebooks/[id]/notes  - 创建新笔记
 * PUT  /api/v1/notebooks/[id]/notes  - 批量同步笔记
 */

import { NextResponse } from "next/server";
import * as authService from "@/services/authService";
import * as noteService from "@/services/noteService";

// ============================================
// GET /api/v1/notebooks/[id]/notes
// ============================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: notebookId } = await params;

  // 1. 认证
  const auth = await authService.authenticateRequest(request);
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: 401 }
    );
  }

  try {
    // 2. 获取笔记
    const notes = await noteService.getNotesByNotebookId(notebookId);

    return NextResponse.json({ data: notes });
  } catch (error) {
    console.error("❌ [API] GET /notebooks/[id]/notes:", error);
    return NextResponse.json(
      { error: "获取笔记失败" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/v1/notebooks/[id]/notes
// ============================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: notebookId } = await params;

  // 1. 认证
  const auth = await authService.authenticateRequest(request);
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: 401 }
    );
  }

  try {
    // 2. 解析请求体
    const body = await request.json();
    const { content, order } = body as {
      content: string;
      order?: number;
    };

    if (content === undefined) {
      return NextResponse.json(
        { error: "content 是必填字段" },
        { status: 400 }
      );
    }

    // 3. 创建笔记
    const note = await noteService.createNote({
      notebookId,
      content,
      order,
    });

    return NextResponse.json({ data: note }, { status: 201 });
  } catch (error) {
    console.error("❌ [API] POST /notebooks/[id]/notes:", error);
    return NextResponse.json(
      { error: "创建笔记失败" },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/v1/notebooks/[id]/notes
// 批量同步（替换所有笔记）
// ============================================

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: notebookId } = await params;

  // 1. 认证
  const auth = await authService.authenticateRequest(request);
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: 401 }
    );
  }

  try {
    // 2. 解析请求体
    const body = await request.json();
    const { notes } = body as {
      notes: Array<{ content: string }>;
    };

    if (!Array.isArray(notes)) {
      return NextResponse.json(
        { error: "notes 必须是数组" },
        { status: 400 }
      );
    }

    // 3. 批量同步笔记
    const savedNotes = await noteService.batchCreateNotes(notebookId, notes);

    return NextResponse.json({ data: savedNotes });
  } catch (error) {
    console.error("❌ [API] PUT /notebooks/[id]/notes:", error);
    return NextResponse.json(
      { error: "同步笔记失败" },
      { status: 500 }
    );
  }
}
