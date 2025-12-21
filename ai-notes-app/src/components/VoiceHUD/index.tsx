"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ============================================
   VOICE HUD SYSTEM
   
   布局结构 (参考 Page/Editor/Mode_Recording):
   ┌──────────────────────────────────────────────────────┐
   │                                              [🔒]    │ ← Lock 浮动图标
   │                                               ↑      │
   │ [VoiceStatusPanel]─────────────[12px]───[VoiceBtn]  │ ← 水平对齐
   │  00:22 | |||||||||| | 🗑️ | <              [62px]    │
   └──────────────────────────────────────────────────────┘
   
   组件层级:
   - VoiceHUDContainer (fixed, 右下角)
     - VoiceStatusPanel (录音状态面板，从右滑入)
     - GesturePad (手势圆盘，淡入+缩放)
     - VoiceButton (核心按钮，始终可见)
     - LockTarget (锁定目标，浮动在按钮上方)
   ============================================ */

// ==========================================
// 类型定义
// ==========================================
type InteractionState = "Idle" | "Pressing" | "Hover/Cancel" | "Hover_Lock" | "Locked";

// ==========================================
// 语音录制接口（预留）
// ==========================================
async function startRecording(): Promise<void> {
  console.log("🎤 [VoiceHUD] 开始录音...");
}

async function stopRecording(cancelled: boolean = false): Promise<void> {
  console.log(`🎤 [VoiceHUD] 停止录音 (取消: ${cancelled})`);
  if (cancelled) return;
  
  // 🔌 LLM API 接入点 - 详见之前的注释
}

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
  // 生成随机波形数据
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
  duration: number; // 录音时长（秒）
  isRecording: boolean;
  onDiscard: () => void;
  onCollapse: () => void;
}

function VoiceStatusPanel({ duration, isRecording, onDiscard, onCollapse }: VoiceStatusPanelProps) {
  // 格式化时间 mm:ss
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
      className="
        flex items-center gap-3
        h-[56px] px-4
        bg-white/90 backdrop-blur-xl
        rounded-full
        shadow-[0_4px_20px_rgba(0,0,0,0.1)]
      "
    >
      {/* 时间显示 */}
      <span className="text-[15px] font-medium text-[#282828] tabular-nums min-w-[40px]">
        {formatTime(duration)}
      </span>
      
      {/* 波形可视化 */}
      <div className="flex-1 min-w-[100px]">
        <WaveformVisualizer isActive={isRecording} />
      </div>
      
      {/* 丢弃按钮 */}
      <button
        type="button"
        onClick={onDiscard}
        className="p-2 rounded-full hover:bg-black/5 transition-colors"
      >
        <DiscardIcon />
      </button>
      
      {/* 收起按钮 */}
      <button
        type="button"
        onClick={onCollapse}
        className="p-2 rounded-full hover:bg-black/5 transition-colors"
      >
        <ChevronIcon />
      </button>
    </motion.div>
  );
}

// ==========================================
// 子组件：手势圆盘（展开状态背景）
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
      style={{
        // 圆盘中心与按钮中心重合
        right: -69, // (200 - 62) / 2 = 69
        bottom: -69,
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* 半透明背景圆盘 */}
      <div className="absolute inset-0 rounded-full bg-[#E5E5E5]/95 shadow-[0_5px_30px_rgba(0,0,0,0.15)]" />
      
      {/* 取消区域指示器（左侧） */}
      <div
        className={`
          absolute left-[16px] top-1/2 -translate-y-1/2
          w-[28px] h-[28px] rounded-full
          flex items-center justify-center
          transition-all duration-200
          ${interactionState === "Hover/Cancel" ? "bg-white/50" : ""}
        `}
      >
        <div className={`
          w-[24px] h-[24px] rounded-full border-[1.5px]
          flex items-center justify-center
          transition-colors duration-200
          ${interactionState === "Hover/Cancel" ? "border-[#E53935]" : "border-[#A0A0A0]"}
        `}>
          <DiscardIcon active={interactionState === "Hover/Cancel"} />
        </div>
      </div>
      
      {/* 收起指示线（右侧和底部） */}
      <div className="absolute right-[56px] top-1/2 -translate-y-1/2 w-[4px] h-[1.5px] bg-[#A0A0A0] rounded-full" />
      <div className="absolute bottom-[56px] left-1/2 -translate-x-1/2 w-[1.5px] h-[4px] bg-[#A0A0A0] rounded-full" />
    </motion.div>
  );
}

// ==========================================
// 子组件：锁定目标（浮动在按钮上方）
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
      className={`
        absolute bottom-[80px] right-[16px]
        w-[32px] h-[32px] rounded-full
        flex items-center justify-center
        transition-all duration-200
        ${active ? "bg-white/50" : ""}
      `}
    >
      <div className={`
        w-[28px] h-[28px] rounded-full border-[1.5px]
        flex items-center justify-center
        transition-colors duration-200
        ${active ? "border-[#282828]" : "border-[#A0A0A0]"}
      `}>
        <LockIcon active={active} />
      </div>
    </motion.div>
  );
}

// ==========================================
// 主组件：VoiceHUD 容器
// ==========================================

interface VoiceHUDProps {
  onTranscription?: (text: string) => void;
  onProcessing?: (isProcessing: boolean) => void;
}

export default function VoiceHUD({ onTranscription, onProcessing }: VoiceHUDProps) {
  // 交互状态
  const [interactionState, setInteractionState] = useState<InteractionState>("Idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 录音时长
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 手势起点
  const startPosRef = useRef({ x: 0, y: 0 });

  // Web Speech API
  const recognitionRef = useRef<any>(null);

  // 初始化 Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 兼容性前缀处理 (iOS Safari 必须使用 webkitSpeechRecognition)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setErrorMessage("Speech Recognition API not supported in this browser.");
        return;
      }

      try {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "zh-CN";

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              // Final transcript handle if needed
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech Recognition Error:", event.error);
          if (event.error === "not-allowed") {
            alert("麦克风权限被拒绝，请在设置中开启。");
          }
        };
      } catch (e) {
        console.error("Speech Recognition Init Error:", e);
      }
    }
  }, []);

  const startVoice = useCallback(() => {
    console.log("🎤 [VoiceHUD] 开始录音...");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      } catch (e) {
        console.error("Recognition start error:", e);
      }
    }
  }, []);

  const stopVoice = useCallback(async (cancelled: boolean) => {
    console.log(`🎤 [VoiceHUD] 停止录音 (取消: ${cancelled})`);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore "not started" errors
      }
      
      if (!cancelled) {
        onProcessing?.(true);
        // 模拟 AI 处理并上屏
        setTimeout(() => {
          onTranscription?.("这是长按发送的模拟语音结果。");
          onProcessing?.(false);
        }, 1500);
      }
    }
  }, [onTranscription, onProcessing]);

  // 是否正在录音
  const isRecording = interactionState !== "Idle" && interactionState !== "Locked";
  const isGesturePadVisible = interactionState === "Pressing" || 
                              interactionState === "Hover/Cancel" || 
                              interactionState === "Hover_Lock";

  // ==========================================
  // 事件处理 (严格长按逻辑)
  // ==========================================
  
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // 捕获指针，防止长按触发浏览器菜单
    e.currentTarget.setPointerCapture(e.pointerId);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    
    // 启动 500ms 定时器
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setInteractionState("Pressing");
      startVoice();
      longPressTimerRef.current = null;
    }, 500);
  }, [startVoice]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // 1. 等待期内移动判定
    if (longPressTimerRef.current) {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      if (Math.sqrt(deltaX ** 2 + deltaY ** 2) > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      return;
    }

    // 2. 录音中手势判定
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
    
    // 情况 A: 500ms 还没到就松手了 (快速点击)
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      setInteractionState("Idle");
      return;
    }

    const finalState = interactionState;
    setInteractionState("Idle");

    // 情况 B: 正常结束并发送
    if (finalState === "Pressing" || finalState === "Hover_Lock") {
      await stopVoice(false);
    } 
    // 情况 C: 取消
    else if (finalState === "Hover/Cancel") {
      await stopVoice(true);
    }
  }, [interactionState, stopVoice]);

  // GesturePad 需要的包装函数（无参数）
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
        touchAction: "none", // 关键：禁止浏览器默认手势
      }}
    >
      <div className="relative w-full h-full flex items-end justify-end">
        {/* Layer 1: VoiceStatusPanel */}
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

        {/* Layer 2: GesturePad */}
        <AnimatePresence>
          {isGesturePadVisible && (
            <GesturePad
              interactionState={interactionState}
              onPointerMove={handlePointerMove}
              onPointerUp={handleGesturePadUp}
            />
          )}
        </AnimatePresence>

        {/* Layer 3: LockTarget */}
        <AnimatePresence>
          {isGesturePadVisible && (
            <LockTarget active={interactionState === "Hover_Lock"} />
          )}
        </AnimatePresence>

        {/* Layer 4: VoiceButton (Core) */}
        {/* 🐛 DEBUG: 红色边框 + touchAction 显式设置 */}
        <motion.button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            touchAction: 'none', // 🐛 DEBUG: 显式设置，防止浏览器默认手势
            WebkitTouchCallout: 'none', // iOS Safari 禁用长按菜单
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          className="
            relative z-10 pointer-events-auto
            w-[62px] h-[62px] rounded-full
            bg-[#282828] flex items-center justify-center
            shadow-2xl cursor-pointer
            touch-none select-none
            border-[5px] border-red-500
          "
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
      </div>
    </div>
  );
}







