/**
 * Notebooks API
 * 
 * REST API 端点，供未来 React Native App 调用
 * 
 * GET  /api/v1/notebooks     - 获取用户的所有笔记本
 * POST /api/v1/notebooks     - 创建新笔记本
 */

import { NextResponse } from "next/server";
import * as authService from "@/services/authService";
import * as noteService from "@/services/noteService";

// ============================================
// GET /api/v1/notebooks
// ============================================

export async function GET(request: Request) {
  // 1. 认证
  const auth = await authService.authenticateRequest(request);
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.code === "UNAUTHORIZED" ? 401 : 500 }
    );
  }

  // 2. 检查数据库
  if (!noteService.checkDatabaseAvailable()) {
    return NextResponse.json({ data: [], message: "数据库未配置" });
  }

  try {
    // 3. 确保用户配置存在
    const userProfile = await noteService.getOrCreateUserProfile(
      auth.data.id,
      auth.data.email,
      auth.data.name
    );

    // 4. 获取笔记本
    const notebooks = await noteService.getNotebooksWithPreview(userProfile.id);

    return NextResponse.json({ data: notebooks });
  } catch (error) {
    console.error("❌ [API] GET /notebooks:", error);
    return NextResponse.json(
      { error: "获取笔记本失败" },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/v1/notebooks
// ============================================

export async function POST(request: Request) {
  // 1. 认证
  const auth = await authService.authenticateRequest(request);
  if (!auth.success) {
    return NextResponse.json(
      { error: auth.error, code: auth.code },
      { status: auth.code === "UNAUTHORIZED" ? 401 : 500 }
    );
  }

  // 2. 检查数据库
  if (!noteService.checkDatabaseAvailable()) {
    return NextResponse.json(
      { error: "数据库未配置" },
      { status: 503 }
    );
  }

  try {
    // 3. 解析请求体
    const body = await request.json().catch(() => ({}));
    const { title } = body as { title?: string };

    // 4. 确保用户配置存在
    const userProfile = await noteService.getOrCreateUserProfile(
      auth.data.id,
      auth.data.email,
      auth.data.name
    );

    // 5. 创建笔记本
    const notebook = await noteService.createNotebook({
      userId: userProfile.id,
      title,
    });

    return NextResponse.json({ data: notebook }, { status: 201 });
  } catch (error) {
    console.error("❌ [API] POST /notebooks:", error);
    return NextResponse.json(
      { error: "创建笔记本失败" },
      { status: 500 }
    );
  }
}
