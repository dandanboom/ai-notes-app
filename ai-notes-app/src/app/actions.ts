"use server";

import OpenAI from "openai";

/**
 * Server Actions for AI Voice Processing
 * 
 * 这些函数在服务器端运行，用于处理：
 * - 语音转文字 (STT) - 使用 OpenAI Whisper
 * - 大语言模型交互 (LLM) - 使用 GPT-4o
 */

// 初始化 OpenAI 客户端
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY 环境变量未设置");
  }
  return new OpenAI({ apiKey });
};

/**
 * 处理语音命令：转录 + 意图判断 + 执行
 * @param formData 包含音频文件的 FormData
 * @returns 处理后的文本内容
 */
export async function processVoiceCommand(formData: FormData): Promise<string> {
  try {
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      throw new Error("未找到音频文件");
    }

    const openai = getOpenAIClient();

    // Step 1: 使用 Whisper 转录音频为文字
    console.log("🎤 [Server Action] 开始转录音频...");
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "zh", // 指定中文，提高准确度
    });

    const transcription = transcriptionResponse.text.trim();
    console.log("📝 [Server Action] 转录结果:", transcription);

    if (!transcription) {
      return ""; // 空转录直接返回
    }

    // Step 2: 使用 GPT-4o 进行意图判断和处理
    console.log("🤖 [Server Action] 开始意图判断...");
    
    const systemPrompt = `你是一个智能笔记助手。用户会通过语音输入内容，你需要判断用户的意图：

**情况 A - 指令类**：如果用户说的是指令或请求（例如："帮我生成一个都江堰旅游计划"、"把这句话改成更正式的表达"、"总结一下刚才的内容"等），请执行该指令并返回生成/修改后的内容。

**情况 B - 听写类**：如果用户只是在记录或听写（例如："今天天气不错"、"下午3点开会"、"记得买牛奶"等），请直接返回转录的原文，不要做任何修改。

**重要规则**：
1. 只返回处理后的纯文本内容，不要添加任何解释、前缀或后缀
2. 如果是指令，直接返回执行结果
3. 如果是听写，直接返回原文
4. 保持简洁，不要有多余的说明文字`;

    const completionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcription },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const result = completionResponse.choices[0]?.message?.content?.trim() || transcription;
    console.log("✅ [Server Action] 处理完成:", result);

    return result;
  } catch (error) {
    console.error("❌ [Server Action] 处理语音命令失败:", error);
    
    // 返回友好的错误信息
    if (error instanceof Error) {
      if (error.message.includes("OPENAI_API_KEY")) {
        throw new Error("API 密钥未配置，请在环境变量中设置 OPENAI_API_KEY");
      }
      throw new Error(`处理失败: ${error.message}`);
    }
    throw new Error("处理语音命令时发生未知错误");
  }
}

/**
 * 处理语音转录文本，调用 LLM 生成响应（保留用于其他场景）
 * @param transcription 用户语音转录的文本
 * @returns LLM 生成的响应文本
 */
export async function processVoiceTranscription(transcription: string): Promise<string> {
  try {
    const openai = getOpenAIClient();

    const completionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant for note-taking." },
        { role: "user", content: transcription },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return completionResponse.choices[0]?.message?.content?.trim() || transcription;
  } catch (error) {
    console.error("❌ [Server Action] 处理语音转录失败:", error);
    throw new Error("处理语音转录时发生错误");
  }
}
