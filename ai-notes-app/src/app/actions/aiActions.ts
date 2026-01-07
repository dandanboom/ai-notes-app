"use server";

/**
 * AI Server Actions
 * 
 * 薄壳层：只负责处理 FormData 和调用 Service
 * 所有 AI 业务逻辑都在 aiService 中
 * 
 * 架构：Server Action -> AIService -> Google AI API
 */

import * as aiService from "@/services/aiService";
import type { AIResponse } from "@/types/ai";

// ============================================
// 类型定义
// ============================================

type AIActionResult = AIResponse | string;

// ============================================
// Voice Actions
// ============================================

/**
 * 处理语音命令
 * 
 * Server Action 薄壳：
 * 1. 从 FormData 提取音频文件
 * 2. 转换为 DataURL
 * 3. 调用 aiService
 */
export async function processVoiceCommand(
  formData: FormData,
  contextContent?: string,
  chatHistory?: string
): Promise<AIActionResult> {
  try {
    console.log("📥 [aiActions] 收到语音请求...");

    // 1. 提取音频文件
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      return "ERROR: 未找到音频文件";
    }

    console.log(`📦 [aiActions] 音频: ${audioFile.name}, ${audioFile.size} bytes`);

    if (audioFile.size === 0) {
      return "ERROR: 音频文件为空";
    }

    // 2. 转换为 DataURL
    const audioDataURL = await aiService.fileToBase64DataURL(audioFile);
    const mimeType = audioFile.type || "audio/webm";

    // 3. 调用 Service
    const result = await aiService.processVoiceCommand({
      audioDataURL,
      mimeType,
      contextContent,
      chatHistory,
    });

    // 4. 返回结果
    if (!result.success) {
      return `ERROR: ${result.error}`;
    }

    return result.data;
  } catch (error) {
    console.error("❌ [aiActions] processVoiceCommand:", error);
    return `ERROR: ${error instanceof Error ? error.message : "未知错误"}`;
  }
}

// ============================================
// Text Actions
// ============================================

/**
 * 处理文本命令
 * 
 * Server Action 薄壳：直接调用 aiService
 */
export async function processTextCommand(
  text: string,
  contextContent?: string,
  chatHistory?: string
): Promise<AIActionResult> {
  try {
    console.log("💬 [aiActions] 收到文本请求:", text.slice(0, 50));

    // 调用 Service
    const result = await aiService.processTextCommand({
      text,
      contextContent,
      chatHistory,
    });

    if (!result.success) {
      return `ERROR: ${result.error}`;
    }

    return result.data;
  } catch (error) {
    console.error("❌ [aiActions] processTextCommand:", error);
    return `ERROR: ${error instanceof Error ? error.message : "未知错误"}`;
  }
}

// ============================================
// Ghost Text Actions
// ============================================

/**
 * 预测 Ghost Text
 * 
 * Server Action 薄壳：直接调用 aiService
 */
export async function predictGhostText(currentContext: string): Promise<string> {
  try {
    const result = await aiService.predictGhostText({
      currentContext,
    });

    if (!result.success) {
      return "";
    }

    return result.data;
  } catch (error) {
    console.error("❌ [aiActions] predictGhostText:", error);
    return "";
  }
}
