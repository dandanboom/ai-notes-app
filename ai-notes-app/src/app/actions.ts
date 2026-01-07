"use server";

/**
 * 向后兼容层
 * 
 * 直接实现函数并调用 aiActions
 * 保持现有代码的 import 路径不变
 * 
 * @deprecated 请直接从 @/app/actions/aiActions 导入
 */

import {
  processVoiceCommand as _processVoiceCommand,
  processTextCommand as _processTextCommand,
  predictGhostText as _predictGhostText,
} from "./actions/aiActions";
import type { AIResponse } from "@/types/ai";

export async function processVoiceCommand(
  formData: FormData,
  contextContent?: string,
  chatHistory?: string
): Promise<AIResponse | string> {
  return _processVoiceCommand(formData, contextContent, chatHistory);
}

export async function processTextCommand(
  text: string,
  contextContent?: string,
  chatHistory?: string
): Promise<AIResponse | string> {
  return _processTextCommand(text, contextContent, chatHistory);
}

export async function predictGhostText(currentContext: string): Promise<string> {
  return _predictGhostText(currentContext);
}
