"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { processVoiceCommand } from "@/app/actions";
import { isErrorResponse } from "@/types/ai";
import type { AIResponse } from "@/types/ai";

/* ============================================
   VOICE HUD SYSTEM
   
   使用 Server Action 处理语音
   ============================================ */

// ==========================================
// 类型定义
// ==========================================
type InteractionState = "Idle" | "Pressing" | "Hover/Cancel" | "Hover_Lock" | "Locked";

// ==========================================
// 子组件：图标
// ==========================================

function VoiceIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className={className}>
      <rect x="4" y="10" width="2.5" height="8" rx="1.25" fill="currentColor" />
      <rect x="9" y="6" width="2.5" height="16" rx="1.25" fill="currentColor" />
      <rect x="14" y="8" width="2.5" height="12" rx="1.25" fill="currentColor" />
      <rect x="19" y="4" width="2.5" height="20" rx="1.25" fill="currentColor" />
      <rect x="24" y="9" width="2.5" height="10" rx="1.25" fill="currentColor" />
    </svg>
  );
}

function LockIcon({ active = false }: { active?: boolean }) {
  const color = active ? "#282828" : "#A0A0A0";
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="3" y="8" width="12" height="8" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M5 8V6C5 3.79086 6.79086 2 9 2C11.2091 2 13 3.79086 13 6V8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DiscardIcon({ active = false }: { active?: boolean }) {
  const color = active ? "#E53935" : "#888888";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 6H16M7 6V5C7 4.44772 7.44772 4 8 4H12C12.5523 4 13 4.44772 13 5V6M14 6V15C14 15.5523 13.5523 16 13 16H7C6.44772 16 6 15.5523 6 15V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 4L6 8L10 12" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ==========================================
// 子组件：音频波形可视化
// ==========================================

function WaveformVisualizer({ isActive }: { isActive: boolean }) {
  const bars = 24;
  
  return (
    <div className="flex items-center gap-[2px] h-[24px]">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[2px] bg-[#282828] rounded-full"
          animate={{
            height: isActive ? [8, 4 + Math.random() * 16, 8] : 4,
          }}
          transition={{
            duration: 0.3,
            repeat: isActive ? Infinity : 0,
            delay: i * 0.02,
          }}
          style={{ height: 4 }}
        />
      ))}
    </div>
  );
}

// ==========================================
// 子组件：录音状态面板
// ==========================================

interface VoiceStatusPanelProps {
  duration: number;
  isRecording: boolean;
  onDiscard: () => void;
  onCollapse: () => void;
}

function VoiceStatusPanel({ duration, isRecording, onDiscard, onCollapse }: VoiceStatusPanelProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex items-center gap-3 h-[56px] px-4 bg-white/90 backdrop-blur-xl rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
    >
      <span className="text-[15px] font-medium text-[#282828] tabular-nums min-w-[40px]">
        {formatTime(duration)}
      </span>
      <div className="flex-1 min-w-[100px]">
        <WaveformVisualizer isActive={isRecording} />
      </div>
      <button type="button" onClick={onDiscard} className="p-2 rounded-full hover:bg-black/5 transition-colors">
        <DiscardIcon />
      </button>
      <button type="button" onClick={onCollapse} className="p-2 rounded-full hover:bg-black/5 transition-colors">
        <ChevronIcon />
      </button>
    </motion.div>
  );
}

// ==========================================
// 子组件：手势圆盘
// ==========================================

interface GesturePadProps {
  interactionState: InteractionState;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
}

function GesturePad({ interactionState, onPointerMove, onPointerUp }: GesturePadProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.3 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.3 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute w-[200px] h-[200px] pointer-events-auto"
      style={{ right: -69, bottom: -69 }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute inset-0 rounded-full bg-[#E5E5E5]/95 shadow-[0_5px_30px_rgba(0,0,0,0.15)]" />
      <div className={`absolute left-[16px] top-1/2 -translate-y-1/2 w-[28px] h-[28px] rounded-full flex items-center justify-center transition-all duration-200 ${interactionState === "Hover/Cancel" ? "bg-white/50" : ""}`}>
        <div className={`w-[24px] h-[24px] rounded-full border-[1.5px] flex items-center justify-center transition-colors duration-200 ${interactionState === "Hover/Cancel" ? "border-[#E53935]" : "border-[#A0A0A0]"}`}>
          <DiscardIcon active={interactionState === "Hover/Cancel"} />
        </div>
      </div>
      <div className="absolute right-[56px] top-1/2 -translate-y-1/2 w-[4px] h-[1.5px] bg-[#A0A0A0] rounded-full" />
      <div className="absolute bottom-[56px] left-1/2 -translate-x-1/2 w-[1.5px] h-[4px] bg-[#A0A0A0] rounded-full" />
    </motion.div>
  );
}

// ==========================================
// 子组件：锁定目标
// ==========================================

interface LockTargetProps {
  active: boolean;
}

function LockTarget({ active }: LockTargetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`absolute bottom-[80px] right-[16px] w-[32px] h-[32px] rounded-full flex items-center justify-center transition-all duration-200 ${active ? "bg-white/50" : ""}`}
    >
      <div className={`w-[28px] h-[28px] rounded-full border-[1.5px] flex items-center justify-center transition-colors duration-200 ${active ? "border-[#282828]" : "border-[#A0A0A0]"}`}>
        <LockIcon active={active} />
      </div>
    </motion.div>
  );
}

// ==========================================
// 主组件：VoiceHUD 容器
// ==========================================

interface VoiceHUDProps {
  /** 当 AI 返回结构化响应时调用 */
  onAIResponse?: (response: AIResponse) => void;
  /** 当 AI 处理状态变化时调用 */
  onProcessing?: (isProcessing: boolean) => void;
  /** 当前文档内容（用于 AI 判断修改意图） */
  contextContent?: string;
  /** 对话历史（用于追问模式） */
  chatHistory?: string;
  /** 兼容旧接口 */
  onTranscription?: (text: string) => void;
}

export default function VoiceHUD({
  onAIResponse,
  onProcessing,
  contextContent,
  chatHistory,
  onTranscription,
}: VoiceHUDProps) {
  // 交互状态
  const [interactionState, setInteractionState] = useState<InteractionState>("Idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 录音状态
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 手势
  const startPosRef = useRef({ x: 0, y: 0 });

  // MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");

  const isRecording = interactionState !== "Idle" && interactionState !== "Locked";

  // 录音计时器
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // 清理录音
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
  }, []);

  // 开始录音
  const startVoice = useCallback(async () => {
    try {
      console.log("🎤 [VoiceHUD] 请求麦克风权限...");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
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

      console.log(`🎤 [VoiceHUD] 开始录音 (${actualMimeType})`);
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error("❌ [VoiceHUD] 启动录音失败:", error);
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          setErrorMessage("麦克风权限被拒绝");
        } else if (error.name === "NotFoundError") {
          setErrorMessage("未找到麦克风设备");
        } else {
          setErrorMessage(`启动录音失败: ${error.message}`);
        }
      }
      cleanupRecording();
    }
  }, [cleanupRecording]);

  // 停止录音并处理
  const stopVoice = useCallback(async (cancelled: boolean) => {
    console.log(`🎤 [VoiceHUD] 停止录音 (取消: ${cancelled})`);

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
            setErrorMessage("没有录制到音频数据");
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

            console.log(`📤 [VoiceHUD] 发送音频: ${fileName}, ${audioFile.size} bytes`);

            // 调用 Server Action
            const result = await processVoiceCommand(formData, contextContent, chatHistory);

            if (isErrorResponse(result)) {
              console.error("❌ [VoiceHUD] 服务器返回错误:", result);
              setErrorMessage(result);
              return;
            }

            const aiResponse = result as AIResponse;
            console.log("✅ [VoiceHUD] 处理完成:", aiResponse.type, "内容长度:", aiResponse.content?.length || 0);

            if (onAIResponse) {
              onAIResponse(aiResponse);
            } else if (onTranscription && aiResponse.content) {
              onTranscription(aiResponse.content);
            }
          } catch (error) {
            console.error("❌ [VoiceHUD] 处理录音失败:", error);
            setErrorMessage(error instanceof Error ? error.message : "处理失败");
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
  }, [onTranscription, onAIResponse, onProcessing, contextContent, chatHistory, cleanupRecording]);

  const isGesturePadVisible = interactionState === "Pressing" || 
                              interactionState === "Hover/Cancel" || 
                              interactionState === "Hover_Lock";

  // ==========================================
  // 事件处理
  // ==========================================
  
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setInteractionState("Pressing");
      startVoice();
      longPressTimerRef.current = null;
    }, 500);
  }, [startVoice]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (longPressTimerRef.current) {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      if (Math.sqrt(deltaX ** 2 + deltaY ** 2) > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      return;
    }

    if (interactionState === "Idle" || interactionState === "Locked") return;
    
    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;
    
    if (deltaY < -50 && Math.abs(deltaX) < Math.abs(deltaY)) {
      setInteractionState("Hover_Lock");
    } else if (deltaX < -50 && Math.abs(deltaY) < Math.abs(deltaX)) {
      setInteractionState("Hover/Cancel");
    } else {
      setInteractionState("Pressing");
    }
  }, [interactionState]);

  const handlePointerUp = useCallback(async (e?: React.PointerEvent) => {
    if (e) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      setInteractionState("Idle");
      return;
    }

    const finalState = interactionState;
    setInteractionState("Idle");

    if (finalState === "Pressing" || finalState === "Hover_Lock") {
      await stopVoice(false);
    } else if (finalState === "Hover/Cancel") {
      await stopVoice(true);
    }
  }, [interactionState, stopVoice]);

  const handleGesturePadUp = useCallback(() => {
    handlePointerUp();
  }, [handlePointerUp]);

  // ==========================================
  // 渲染
  // ==========================================
  
  return (
    <div 
      className="absolute bottom-[21px] right-[16px] z-[100] pointer-events-none select-none"
      style={{ 
        width: isGesturePadVisible ? 300 : 62,
        height: isGesturePadVisible ? 250 : 62,
        touchAction: "none",
      }}
    >
      <div className="relative w-full h-full flex items-end justify-end">
        {/* VoiceStatusPanel */}
        <AnimatePresence>
          {(isRecording || interactionState === "Locked") && (
            <div className="absolute bottom-0 right-[74px] pointer-events-auto">
              <VoiceStatusPanel
                duration={recordingDuration}
                isRecording={isRecording}
                onDiscard={() => stopVoice(true)}
                onCollapse={() => stopVoice(false)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* GesturePad */}
        <AnimatePresence>
          {isGesturePadVisible && (
            <GesturePad
              interactionState={interactionState}
              onPointerMove={handlePointerMove}
              onPointerUp={handleGesturePadUp}
            />
          )}
        </AnimatePresence>

        {/* LockTarget */}
        <AnimatePresence>
          {isGesturePadVisible && (
            <LockTarget active={interactionState === "Hover_Lock"} />
          )}
        </AnimatePresence>

        {/* VoiceButton */}
        <motion.button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          className="relative z-10 pointer-events-auto w-[62px] h-[62px] rounded-full bg-[#282828] flex items-center justify-center shadow-2xl cursor-pointer touch-none select-none"
          animate={{ scale: interactionState === "Pressing" ? 1.1 : 1 }}
        >
          <VoiceIcon className="text-white" />
          {isRecording && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-[4px] right-[4px] w-[10px] h-[10px] rounded-full bg-red-500"
            />
          )}
        </motion.button>

        {/* Error Message */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-[80px] right-0 bg-red-500 text-white text-xs px-3 py-2 rounded-lg max-w-[200px] pointer-events-auto shadow-lg z-[200]"
            >
              {errorMessage}
              <button onClick={() => setErrorMessage(null)} className="ml-2 text-white/80 hover:text-white">
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
