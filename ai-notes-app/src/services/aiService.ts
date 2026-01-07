/**
 * AI Service - AI 业务逻辑层
 * 
 * 封装所有 AI 相关的业务逻辑
 * 可被 Server Actions 和 API Routes 共同调用
 * 
 * 注意：这个文件不是 Server Action，没有 "use server" 指令
 */

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import * as Diff from "diff";
import type { AIResponse } from "@/types/ai";

// ============================================
// 类型定义
// ============================================

export interface VoiceCommandInput {
  audioDataURL: string;
  mimeType: string;
  contextContent?: string;
  chatHistory?: string;
}

export interface TextCommandInput {
  text: string;
  contextContent?: string;
  chatHistory?: string;
}

export interface GhostTextInput {
  currentContext: string;
}

export type AIServiceResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================
// Zod Schema 定义
// ============================================

/**
 * AI 响应 Schema - 全局对话模式
 */
const AIResponseSchema = z.object({
  type: z.enum(["append", "review", "inquire"]).describe(
    "响应类型: append=新增内容, review=修改建议, inquire=追问澄清"
  ),
  content: z.string().describe(
    "内容字段: append模式为新增内容, review模式为修改后完整段落, inquire模式为追问问题"
  ),
  userInput: z.string().describe(
    "用户说了什么 - 简洁复述用户的语音/文本输入"
  ),
  thought: z.string().optional().describe(
    "AI 的简短思考过程，用于调试"
  ),
});

/**
 * 行内编辑专用 Schema - Few-Shot Example 策略
 */
const InlineEditSchema = z.object({
  transcription: z.string().describe(
    "Step 1: The exact raw transcription of what the user said."
  ),
  type: z.enum(["append", "review"]).describe(
    "Step 2: If the transcription contains specific keywords like 'Change', 'Delete', 'Replace', '改', '删', '换' -> use 'review'. OTHERWISE -> ALWAYS use 'append'."
  ),
  content: z.string().describe(
    "Step 3: The final text payload. NO questions. NO conversational filler."
  ),
});

/**
 * Ghost Text 预测 Schema
 */
const GhostTextSchema = z.object({
  prediction: z.string().describe("预测的续写内容，1-2句话"),
});

// ============================================
// System Prompts
// ============================================

const GLOBAL_SYSTEM_PROMPT = `你是一个智能的中文笔记助手。

## 🎯 核心任务：区分"口述"和"指令"

### 判断规则（按顺序检查）

**Step 1: 是否包含具体内容？**
如果用户的话中包含：
- 具体的时间（3点、明天、下周一）
- 具体的事项（开会、买菜、写报告）
- 具体的数据（3个任务、100元、2小时）
- 描述性内容（今天很累、项目进展顺利）

→ **直接返回 type: "append"**，将内容整理成 Markdown

**Step 2: 是否是"生成/创建"类指令？**
关键词：帮我写、生成一个、做个计划、列个清单、创建一份

如果是，且**缺少关键参数**：
→ **返回 type: "inquire"**，追问 1-2 个核心问题

如果是，且**信息已充足**：
→ **返回 type: "append"**，直接生成内容

**Step 3: 是否是"修改"类指令？**
关键词：把这段改成、修改、润色、删掉、调整

→ **返回 type: "review"**，输出修改后的完整内容

## 示例判断

| 用户说 | 判断 | 类型 |
|-------|------|-----|
| "记一下，明天下午3点开会" | 有具体时间和事项 | append |
| "今天完成了三个任务：调研、写报告、开会" | 有具体内容 | append |
| "帮我写个旅游计划" | 生成指令，缺少关键信息 | inquire |
| "帮我写个去成都2天的旅游计划" | 生成指令，信息充足 | append |
| "把时间改成4点" | 修改指令 | review |

## 上下文融合（当存在对话历史时）

当用户在**回答追问**时：
1. 回溯对话历史，找到原始需求
2. 合并：原始需求 + 补充信息
3. 生成**完整丰富**的内容（type: "append"）

## 追问约束

- 一次只问 **1 个**最核心的问题
- 问题要**简短口语化**（如"大概去几天？"）
- content **只放问题**，不要客套话

## 逃生舱

用户说 "随便/都可以/你定" → 停止追问，用常识补全，生成内容`;

const INLINE_EDIT_SYSTEM_PROMPT = `You are a background text processing engine. You are NOT a chatbot. You never ask questions.

YOUR GOAL: Process user voice input into Markdown text.

### REFERENCE EXAMPLES (Strictly mimic this behavior)

**CASE 1: Appending new content (Dictation)**
Input Context: "- Buy milk"
User Audio: "And buy eggs"
Output:
{
  "transcription": "And buy eggs",
  "type": "append",
  "content": "- Buy eggs"
}

**CASE 2: Appending with new sentence**
Input Context: "The project is going well."
User Audio: "We need to speed up."
Output:
{
  "transcription": "We need to speed up.",
  "type": "append",
  "content": "We need to speed up."
}

**CASE 3: Specific Edit (Review)**
Input Context: "- Meeting at 3pm"
User Audio: "Change meeting to 4pm"
Output:
{
  "transcription": "Change meeting to 4pm",
  "type": "review",
  "content": "- Meeting at 4pm"
}

**CASE 4: Vague Input (Default to Append)**
Input Context: "TODO List"
User Audio: "Tomorrow"
Output:
{
  "transcription": "Tomorrow",
  "type": "append",
  "content": "- Tomorrow"
}

**CASE 5: Chinese Edit Command**
Input Context: "- 9:00 开会\\n- 10:00 **写代码**"
User Audio: "把写代码改成写文档"
Output:
{
  "transcription": "把写代码改成写文档",
  "type": "review",
  "content": "- 9:00 开会\\n- 10:00 **写文档**"
}

**CASE 6: Chinese Append**
Input Context: "- 9:00 开会"
User Audio: "下午三点去健身"
Output:
{
  "transcription": "下午三点去健身",
  "type": "append",
  "content": "- 下午三点去健身"
}

### EXECUTION RULES

1. **Transcription First:** Always fill the 'transcription' field with the raw user audio first.
2. **The "Review" Trigger:** Only use 'review' type if the user explicitly says "Change", "Delete", "Remove", "Update", "Replace", "改", "删", "换".
3. **The "Append" Default:** For EVERYTHING else (even if it's short, vague, or grammatically incomplete), use 'append'.
4. **Formatting:**
   - If context is a list, format append as a list item (with \`- \`).
   - If context is prose, format append as a sentence.
   - **PRESERVE MARKDOWN** in 'review' mode (bolding, headers).
5. **NO QUESTIONS:** Never output questions like "What do you want to add?" or "你想添加什么？"
`;

const GHOST_TEXT_SYSTEM_PROMPT = `你是一个思维补全助手。根据上文预测用户下一句想说的话。
要求：
1. 简短精炼（1-2句话）
2. 逻辑顺畅承接上文
3. 只返回预测内容，不要解释
4. 如果难以预测，返回空字符串`;

// ============================================
// Google AI 配置
// ============================================

function getGoogleAI() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY 环境变量未设置");
  }

  let baseURL = process.env.GOOGLE_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
  const modelId = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";

  // 确保 baseURL 以 /v1beta 结尾
  if (!baseURL.includes("/v1beta") && !baseURL.includes("/v1")) {
    baseURL = baseURL.replace(/\/$/, "") + "/v1beta";
  }

  return createGoogleGenerativeAI({
    apiKey,
    baseURL,
  })(modelId);
}

// ============================================
// 核心业务方法
// ============================================

/**
 * 处理语音命令
 * 
 * 纯业务逻辑，不包含认证
 */
export async function processVoiceCommand(
  input: VoiceCommandInput
): Promise<AIServiceResult<AIResponse>> {
  try {
    const { audioDataURL, mimeType, contextContent, chatHistory } = input;

    // 判断场景
    const hasContext = contextContent && contextContent.trim().length > 0;
    const hasChatHistory = chatHistory && chatHistory.trim().length > 0;
    const isInlineEditMode = hasContext && !hasChatHistory;

    // 准备 Prompt
    let userPrompt: string;
    let systemPrompt: string;
    const schema = isInlineEditMode ? InlineEditSchema : AIResponseSchema;

    if (isInlineEditMode) {
      systemPrompt = INLINE_EDIT_SYSTEM_PROMPT;
      userPrompt = `CONTEXT (目标文本):
\`\`\`markdown
${contextContent}
\`\`\`

TASK: 听取音频指令，直接修改上述文本。严禁反问。`;
    } else if (hasChatHistory) {
      systemPrompt = GLOBAL_SYSTEM_PROMPT;
      userPrompt = `## 对话历史

${chatHistory}

## 当前笔记上下文
${hasContext ? contextContent : "(空)"}

## 当前交互
用户正在通过语音回答你之前的追问。`;
    } else {
      systemPrompt = GLOBAL_SYSTEM_PROMPT;
      userPrompt = hasContext
        ? `上下文：\n${contextContent}\n\n用户指令：听取语音并整理成 Markdown 格式。`
        : `这是一份新笔记，请听取用户的语音并整理成 Markdown 格式。`;
    }

    console.log("🤖 [AIService] 调用 Gemini API...");
    console.log("📋 [AIService] 模式:", isInlineEditMode ? "行内编辑" : hasChatHistory ? "对话" : "全局");

    // 使用 generateObject 获取结构化输出
    const result = await generateObject({
      model: getGoogleAI(),
      schema,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              data: audioDataURL,
              mediaType: mimeType,
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
      temperature: isInlineEditMode ? 0.1 : 0.4,
    });

    const response = result.object;
    console.log("✅ [AIService] 完成:", response.type, "内容长度:", response.content?.length || 0);

    const transcription = (response as any).transcription || (response as any).userInput;
    if (transcription) {
      console.log("🎤 [AIService] 转录:", transcription);
    }

    // 行内编辑模式：计算差异量
    if (isInlineEditMode && response.type === "review" && contextContent) {
      const changes = Diff.diffChars(contextContent, response.content || "");
      let changedCharCount = 0;

      changes.forEach(part => {
        if (part.added || part.removed) {
          changedCharCount += part.value.length;
        }
      });

      console.log(`📊 [AIService] 变更字符数: ${changedCharCount}`);

      const shouldSkipDiff = changedCharCount <= 10;

      return {
        success: true,
        data: {
          type: shouldSkipDiff ? "review_immediate" : "review",
          content: response.content || "",
          userInput: transcription || "(语音输入)",
          changedCharCount,
        },
      };
    }

    return {
      success: true,
      data: {
        type: response.type as "append" | "review" | "inquire",
        content: response.content || "",
        userInput: transcription || (response as any).userInput || "(语音输入)",
        thought: (response as any).thought,
      },
    };
  } catch (error) {
    console.error("❌ [AIService] 语音处理错误:", error);
    
    const message = error instanceof Error ? error.message : "未知错误";
    return { success: false, error: message };
  }
}

/**
 * 处理文本命令
 * 
 * 纯业务逻辑，不包含认证
 */
export async function processTextCommand(
  input: TextCommandInput
): Promise<AIServiceResult<AIResponse>> {
  try {
    const { text, contextContent, chatHistory } = input;

    let userPrompt: string;
    if (chatHistory) {
      userPrompt = `## 完整对话历史
${chatHistory}

## 当前笔记上下文
${contextContent || "(空)"}

## 用户最新回复
${text}`;
    } else {
      userPrompt = contextContent
        ? `上下文：\n${contextContent}\n\n用户指令：${text}`
        : `用户指令：${text}`;
    }

    const result = await generateObject({
      model: getGoogleAI(),
      schema: AIResponseSchema,
      system: GLOBAL_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.4,
    });

    const response = result.object;
    
    return {
      success: true,
      data: {
        type: response.type,
        content: response.content || "",
        userInput: response.userInput || text,
        thought: response.thought,
      },
    };
  } catch (error) {
    console.error("❌ [AIService] 文本处理错误:", error);
    
    const message = error instanceof Error ? error.message : "未知错误";
    return { success: false, error: message };
  }
}

/**
 * 预测 Ghost Text
 * 
 * 纯业务逻辑，不包含认证
 */
export async function predictGhostText(
  input: GhostTextInput
): Promise<AIServiceResult<string>> {
  try {
    const { currentContext } = input;

    if (!currentContext || currentContext.trim().length < 5) {
      return { success: true, data: "" };
    }

    console.log("👻 [AIService] Ghost Text 预测中...");

    const result = await generateObject({
      model: getGoogleAI(),
      schema: GhostTextSchema,
      system: GHOST_TEXT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `上文：${currentContext}\n\n请预测下一句：`,
        },
      ],
      temperature: 0.7,
    });

    const prediction = result.object.prediction?.trim() || "";

    if (prediction.length > 100) {
      return { success: true, data: "" };
    }

    console.log("👻 [AIService] 预测结果:", prediction);
    return { success: true, data: prediction };
  } catch (error) {
    console.error("❌ [AIService] Ghost Text 预测失败:", error);
    return { success: true, data: "" }; // Ghost Text 失败不应阻塞
  }
}

// ============================================
// 工具函数（导出供外部使用）
// ============================================

/**
 * 将 File 转换为 Base64 Data URL
 */
export async function fileToBase64DataURL(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:${file.type};base64,${base64}`;
}
