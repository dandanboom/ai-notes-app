/**
 * Single Notebook API
 * 
 * REST API 端点，供未来 React Native App 调用
 * 
 * GET    /api/v1/notebooks/[id]  - 获取笔记本详情（包含笔记）
 * PATCH  /api/v1/notebooks/[id]  - 更新笔记本
 * DELETE /api/v1/notebooks/[id]  - 删除笔记本
 */

import { NextResponse } from "next/server";
import * as authService from "@/services/authService";
import * as noteService from "@/services/noteService";

// ============================================
// GET /api/v1/notebooks/[id]
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
    // 2. 获取笔记本
    const notebook = await noteService.getNotebookWithNotes(notebookId);

    if (!notebook) {
      return NextResponse.json(
        { error: "笔记本不存在" },
        { status: 404 }
      );
    }

    // TODO: 验证用户权限

    return NextResponse.json({ data: notebook });
  } catch (error) {
    console.error("❌ [API] GET /notebooks/[id]:", error);
    return NextResponse.json(
      { error: "获取笔记本失败" },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/v1/notebooks/[id]
// ============================================

export async function PATCH(
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
    const { title, description, emoji } = body as {
      title?: string;
      description?: string;
      emoji?: string;
    };

    // 3. 更新笔记本
    const notebook = await noteService.updateNotebook(notebookId, {
      title,
      description,
      emoji,
    });

    return NextResponse.json({ data: notebook });
  } catch (error) {
    console.error("❌ [API] PATCH /notebooks/[id]:", error);
    return NextResponse.json(
      { error: "更新笔记本失败" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/v1/notebooks/[id]
// ============================================

export async function DELETE(
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
    // 2. 删除笔记本
    await noteService.deleteNotebook(notebookId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [API] DELETE /notebooks/[id]:", error);
    return NextResponse.json(
      { error: "删除笔记本失败" },
      { status: 500 }
    );
  }
}
