/**
 * Text AI API
 * 
 * REST API 端点，供未来 React Native App 调用
 * 
 * POST /api/v1/ai/text       - 处理文本命令
 * POST /api/v1/ai/text/ghost - 预测 Ghost Text
 */

import { NextResponse } from "next/server";
import * as aiService from "@/services/aiService";

// ============================================
// POST /api/v1/ai/text
// ============================================

export async function POST(request: Request) {
  try {
    console.log("💬 [API] POST /ai/text");

    // 1. 解析请求体
    const body = await request.json();
    const { text, context, chatHistory, action } = body as {
      text: string;
      context?: string;
      chatHistory?: string;
      action?: "process" | "ghost";
    };

    // 2. 根据 action 分发
    if (action === "ghost") {
      // Ghost Text 预测
      if (!text) {
        return NextResponse.json({ data: "" });
      }

      const result = await aiService.predictGhostText({
        currentContext: text,
      });

      return NextResponse.json({ data: result.success ? result.data : "" });
    }

    // 3. 文本命令处理
    if (!text) {
      return NextResponse.json(
        { error: "text 是必填字段" },
        { status: 400 }
      );
    }

    const result = await aiService.processTextCommand({
      text,
      contextContent: context,
      chatHistory,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("❌ [API] POST /ai/text:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理文本失败" },
      { status: 500 }
    );
  }
}
