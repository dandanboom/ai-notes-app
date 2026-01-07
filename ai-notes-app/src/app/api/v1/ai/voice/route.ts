/**
 * Voice AI API
 * 
 * REST API 端点，供未来 React Native App 调用
 * 
 * POST /api/v1/ai/voice  - 处理语音命令
 */

import { NextResponse } from "next/server";
import * as aiService from "@/services/aiService";

// ============================================
// POST /api/v1/ai/voice
// ============================================

export async function POST(request: Request) {
  try {
    console.log("📥 [API] POST /ai/voice");

    // 1. 解析 FormData
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const contextContent = formData.get("context") as string | null;
    const chatHistory = formData.get("chatHistory") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "未找到音频文件" },
        { status: 400 }
      );
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: "音频文件为空" },
        { status: 400 }
      );
    }

    console.log(`📦 [API] 音频: ${audioFile.name}, ${audioFile.size} bytes`);

    // 2. 转换为 DataURL
    const audioDataURL = await aiService.fileToBase64DataURL(audioFile);
    const mimeType = audioFile.type || "audio/webm";

    // 3. 调用 Service
    const result = await aiService.processVoiceCommand({
      audioDataURL,
      mimeType,
      contextContent: contextContent || undefined,
      chatHistory: chatHistory || undefined,
    });

    // 4. 返回结果
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("❌ [API] POST /ai/voice:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理语音失败" },
      { status: 500 }
    );
  }
}
