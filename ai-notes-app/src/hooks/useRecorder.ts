"use client";

import { useState, useRef, useCallback } from "react";
import { processVoiceCommand } from "@/app/actions";
import { isErrorResponse } from "@/types/ai";
import type { AIResponse } from "@/types/ai";

/**
 * 录音 Hook - 可复用的录音逻辑
 * 用于底部大按钮和行内小灰点的录音功能
 * 
 * 使用 Vercel AI SDK 的 generateObject 获取结构化输出
 */
export interface UseRecorderOptions {
  /** 纯文本回调（兼容旧接口，仅传递 content） */
  onTranscription?: (text: string) => void;
  /** 结构化响应回调（新接口，传递完整 AIResponse） */
  onAIResponse?: (response: AIResponse) => void;
  /** 处理状态回调 */
  onProcessing?: (isProcessing: boolean) => void;
  /** 错误回调 */
  onError?: (error: string) => void;
  /** 当前文档内容（用于 AI 判断修改意图） */
  contextContent?: string;
  /** 对话历史 */
  chatHistory?: string;
}

export interface UseRecorderReturn {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: (cancelled?: boolean) => Promise<void>;
  errorMessage: string | null;
}

export function useRecorder({
  onTranscription,
  onAIResponse,
  onProcessing,
  onError,
  contextContent,
  chatHistory,
}: UseRecorderOptions = {}): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // MediaRecorder 相关
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 清理函数：停止录音和释放资源
  const cleanupRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("停止 MediaRecorder 失败:", e);
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    mimeTypeRef.current = "audio/webm";
    setIsRecording(false);
    setRecordingDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      console.log("🎤 [useRecorder] 请求麦克风权限...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      const actualMimeType = mediaRecorder.mimeType || "audio/webm";
      mimeTypeRef.current = actualMimeType;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      console.log(`🎤 [useRecorder] 开始录音 (${actualMimeType})`);

      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error("❌ [useRecorder] 启动录音失败:", error);
      let errorMsg = "启动录音失败";
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          errorMsg = "麦克风权限被拒绝";
        } else if (error.name === "NotFoundError") {
          errorMsg = "未找到麦克风设备";
        } else {
          errorMsg = `启动录音失败: ${error.message}`;
        }
      }
      setErrorMessage(errorMsg);
      onError?.(errorMsg);
      cleanupRecording();
    }
  }, [cleanupRecording, onError]);

  // 停止录音并处理
  const stopRecording = useCallback(
    async (cancelled: boolean = false) => {
      console.log(`🎤 [useRecorder] 停止录音 (取消: ${cancelled})`);

      if (!mediaRecorderRef.current) {
        cleanupRecording();
        return;
      }

      const recorder = mediaRecorderRef.current;

      if (recorder.state === "inactive") {
        cleanupRecording();
        return;
      }

      if (recorder.state === "recording") {
        recorder.onstop = () => {
          setTimeout(async () => {
            if (cancelled) {
              cleanupRecording();
              return;
            }

            if (audioChunksRef.current.length === 0) {
              const errorMsg = "没有录制到音频数据";
              setErrorMessage(errorMsg);
              onError?.(errorMsg);
              cleanupRecording();
              onProcessing?.(false);
              return;
            }

            const mimeType = mimeTypeRef.current;

            try {
              onProcessing?.(true);

              const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
              const formData = new FormData();
              const fileName = mimeType.includes("mp4") ? "recording.mp4" : "recording.webm";
              const audioFile = new File([audioBlob], fileName, { type: mimeType });
              formData.append("audio", audioFile);

              console.log(`📤 [useRecorder] 发送音频: ${fileName}, ${audioFile.size} bytes`);

              const result = await processVoiceCommand(formData, contextContent, chatHistory);

              if (isErrorResponse(result)) {
                setErrorMessage(result);
                onError?.(result);
                return;
              }

              const aiResponse = result as AIResponse;
              console.log("✅ [useRecorder] 处理完成:", aiResponse.type);

              if (onAIResponse) {
                onAIResponse(aiResponse);
              } else if (onTranscription && aiResponse.content) {
                onTranscription(aiResponse.content);
              }
            } catch (error) {
              console.error("❌ [useRecorder] 处理录音失败:", error);
              const errorMsg = error instanceof Error ? error.message : "处理失败";
              setErrorMessage(errorMsg);
              onError?.(errorMsg);
            } finally {
              onProcessing?.(false);
              cleanupRecording();
            }
          }, 500);
        };

        recorder.stop();
      } else {
        cleanupRecording();
      }
    },
    [onTranscription, onAIResponse, onProcessing, onError, contextContent, chatHistory, cleanupRecording]
  );

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    errorMessage,
  };
}


