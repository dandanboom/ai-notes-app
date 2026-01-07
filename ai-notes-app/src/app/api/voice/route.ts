import { streamObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

// ============================================
// Zod Schema
// ============================================

const AIResponseSchema = z.object({
  type: z.enum(["append", "review", "inquire"]).describe(
    "响应类型: append=新增内容, review=修改建议, inquire=追问澄清"
  ),
  content: z.string().describe(
    "内容字段"
  ),
  userInput: z.string().describe(
    "用户说了什么"
  ),
  thought: z.string().optional().describe(
    "AI 的思考过程"
  ),
});

const InlineEditSchema = z.object({
  type: z.enum(["append", "review"]).describe(
    "响应类型 (行内编辑禁止 inquire)"
  ),
  content: z.string().describe(
    "处理后的完整文本"
  ),
  userInput: z.string().describe(
    "用户说了什么"
  ),
  transcription: z.string().optional().describe(
    "用户语音转写"
  ),
});

// ============================================
// Google AI 配置
// ============================================

const getGoogleAI = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY 环境变量未设置");
  }

  const baseURL = process.env.GOOGLE_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
  const modelId = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";

  return createGoogleGenerativeAI({
    apiKey,
    baseURL,
  })(modelId);
};

// ============================================
// System Prompts
// ============================================

const GLOBAL_SYSTEM_PROMPT = `你是一个智能的中文笔记助手。

## 🎯 核心任务：区分"口述"和"指令"

**Step 1: 是否包含具体内容？**
如果用户的话中包含具体时间、事项、数据、描述性内容：
→ **直接返回 type: "append"**，将内容整理成 Markdown

**Step 2: 是否是"生成/创建"类指令？**
如果缺少关键参数 → **返回 type: "inquire"**，追问核心问题
如果信息充足 → **返回 type: "append"**，直接生成

**Step 3: 是否是"修改"类指令？**
→ **返回 type: "review"**，输出修改后的完整内容

## 追问约束
- 一次只问 **1 个**最核心的问题
- 问题要**简短口语化**

## 逃生舱
用户说 "随便/都可以/你定" → 停止追问，用常识补全`;

const INLINE_EDIT_SYSTEM_PROMPT = `你是一个文本处理引擎。严禁闲聊，严禁反问。

## 核心判断
- **review**: 用户说"把...改成..."等修改指令 → 输出修改后的完整文本
- **append**: 用户在口述新内容 → 输出整理后的 Markdown

## 绝对禁止
- ❌ 禁止返回 inquire
- ❌ 禁止反问`;

// ============================================
// Route Handler
// ============================================

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const contextContent = formData.get("contextContent") as string | null;
    const chatHistory = formData.get("chatHistory") as string | null;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "未找到音频文件" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (audioFile.size === 0) {
      return new Response(JSON.stringify({ error: "音频文件为空" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`📥 [API] 收到音频: ${audioFile.name}, ${audioFile.size} bytes`);

    // 转换音频为 Data URL
    const buffer = await audioFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const audioDataURL = `data:${audioFile.type};base64,${base64}`;

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
      userPrompt = `CONTEXT:\n\`\`\`\n${contextContent}\n\`\`\`\n\nTASK: 听取音频指令，直接修改文本。`;
    } else if (hasChatHistory) {
      systemPrompt = GLOBAL_SYSTEM_PROMPT;
      userPrompt = `## 对话历史\n${chatHistory}\n\n## 上下文\n${hasContext ? contextContent : "(空)"}\n\n用户正在回答追问。`;
    } else {
      systemPrompt = GLOBAL_SYSTEM_PROMPT;
      userPrompt = hasContext
        ? `上下文：\n${contextContent}\n\n听取语音并整理成 Markdown。`
        : `新笔记，请听取语音并整理成 Markdown。`;
    }

    console.log(`🤖 [API] 模式: ${isInlineEditMode ? "行内编辑" : "全局"}, 开始流式处理...`);

    // 使用 streamObject 进行流式输出
    const result = streamObject({
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
              mediaType: audioFile.type || "audio/webm",
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
      temperature: isInlineEditMode ? 0.2 : 0.4,
    });

    // 返回流式响应
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("❌ [API] 错误:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "未知错误" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}




