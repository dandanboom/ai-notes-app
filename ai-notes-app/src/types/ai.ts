/**
 * AI 响应相关类型定义
 * 
 * 这些类型在客户端和服务端共享使用
 */

/**
 * AI 响应的结构化类型
 * 支持三种场景：新增内容、修改建议、追问澄清
 * 
 * 设计原则：
 * - 简化数据结构，前端已有原文，不需要 AI 返回
 * - append: 新增内容，直接追加到文档
 * - review: 修改建议，content 是修改后的完整新段落
 * - inquire: 信息不足，反问用户以获取更多细节
 */
export interface AIResponse {
  /** 
   * 响应类型
   * - append: 新增内容
   * - review: 修改建议（需显示 Diff 视图）
   * - review_immediate: 小修改（≤10字），直接应用不显示 Diff
   * - inquire: 追问澄清（信息不足时）
   */
  type: 'append' | 'review' | 'review_immediate' | 'inquire';
  /** 
   * 内容字段
   * - append 模式: 新增的内容 (Markdown 格式)
   * - review/review_immediate 模式: 修改后的完整新段落 (Markdown 格式)
   * - inquire 模式: 追问问题（纯文本，显示给用户）
   */
  content: string;
  /** 
   * (必填) 用户说了什么 - AI 对用户语音/文本的理解
   * 用于在对话历史中显示用户消息气泡
   */
  userInput: string;
  /** (可选) AI 的简短思考，用于调试和理解意图 */
  thought?: string;
  /** (可选) 会话 ID，用于追问模式下保持上下文 */
  chat_id?: string;
  /** (可选) 变更字符数，用于调试 */
  changedCharCount?: number;
}

/**
 * 类型守卫：检查返回值是否为错误字符串
 */
export function isErrorResponse(response: AIResponse | string): response is string {
  return typeof response === 'string' && response.startsWith('ERROR:');
}




