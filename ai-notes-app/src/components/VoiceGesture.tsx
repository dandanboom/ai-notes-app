"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ============================================
   VOICE GESTURE CONTROLLER (VoiceHUD)
   Based on Figma: Controller/VoiceGesture
   Node ID: 992:1477
   
   Interaction States (from Figma Variants):
   - Idle: 默认状态，62px 黑色圆形按钮
   - Pressing: 按压中，展开为 240px 面板
   - Hover/Cancel: 手指滑向左侧取消区域
   - Hover_Lock: 手指滑向顶部锁定区域
   ============================================ */

// ==========================================
// 1. 类型定义：严格对应 Figma 变体
// ==========================================
type InteractionState = "Idle" | "Pressing" | "Hover/Cancel" | "Hover_Lock";

// ==========================================
// 2. 语音录制接口（预留）
// ==========================================

/**
 * 开始录音
 * TODO: 接入 Web Audio API 或第三方语音识别服务
 * - 可以使用 MediaRecorder API 录制音频
 * - 或使用 Web Speech API 进行实时语音识别
 */
async function startRecording(): Promise<void> {
  console.log("🎤 [VoiceHUD] 开始录音...");
  
  // TODO: 实现录音逻辑
  // const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // const mediaRecorder = new MediaRecorder(stream);
  // mediaRecorder.start();
}

/**
 * 停止录音并处理结果
 * @param cancelled - 是否被用户取消
 * 
 * TODO: 在此处接入你的 LLM API
 */
async function stopRecording(cancelled: boolean = false): Promise<void> {
  console.log(`🎤 [VoiceHUD] 停止录音 (取消: ${cancelled})`);
  
  if (cancelled) {
    // 用户取消，不做任何处理
    console.log("🚫 [VoiceHUD] 用户取消录音，丢弃音频数据");
    return;
  }
  
  // ==========================================
  // 🔌 LLM API 接入点
  // ==========================================
  // 
  // 在这里将语音转文字结果发送到你的 LLM API
  // 
  // 步骤 1: 获取录音的音频数据 (Blob/ArrayBuffer)
  // 步骤 2: 调用语音转文字 API (Whisper/Google STT/Azure)
  // 步骤 3: 将文字发送到 /api/chat 端点
  //
  // 示例代码：
  // ```typescript
  // const audioBlob = await getRecordedAudio(); // 你的录音数据
  // 
  // // 1. 语音转文字 (如果使用 OpenAI Whisper)
  // const formData = new FormData();
  // formData.append('file', audioBlob, 'audio.webm');
  // formData.append('model', 'whisper-1');
  // 
  // const transcription = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
  //   },
  //   body: formData,
  // });
  // 
  // const { text } = await transcription.json();
  // 
  // // 2. 发送到你的聊天 API
  // const response = await fetch('/api/chat', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     message: text,
  //     // 你的 API Key 应该在服务端环境变量中配置
  //     // 不要在客户端暴露 API Key!
  //   }),
  // });
  // 
  // const result = await response.json();
  // console.log('LLM Response:', result);
  // ```
  //
  // ⚠️ 安全提示：
  // - API Key 应该存储在服务端 (.env.local)
  // - 创建 /api/chat 路由来代理请求
  // - 永远不要在客户端代码中硬编码 API Key
  // ==========================================
  
  console.log("✅ [VoiceHUD] 录音完成，准备发送到 LLM...");
}

// ==========================================
// 3. 图标组件
// ==========================================

// 语音波形图标
function VoiceIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="9" width="2" height="6" rx="1" fill="currentColor" />
      <rect x="8" y="6" width="2" height="12" rx="1" fill="currentColor" />
      <rect x="12" y="8" width="2" height="8" rx="1" fill="currentColor" />
      <rect x="16" y="5" width="2" height="14" rx="1" fill="currentColor" />
      <rect x="20" y="9" width="2" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

// 锁定图标
function LockIcon({ active = false }: { active?: boolean }) {
  const color = active ? "#282828" : "#A0A0A0";
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="6" width="10" height="7" rx="2" stroke={color} strokeWidth="1.5" />
      <path
        d="M4 6V4C4 2.34315 5.34315 1 7 1C8.65685 1 10 2.34315 10 4V6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 取消/丢弃图标
function DiscardIcon({ active = false }: { active?: boolean }) {
  const color = active ? "#E53935" : "#A0A0A0";
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 4H11M5 4V3C5 2.44772 5.44772 2 6 2H8C8.55228 2 9 2.44772 9 3V4M10 4V11C10 11.5523 9.55228 12 9 12H5C4.44772 12 4 11.5523 4 11V4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 目标圆圈（悬停区域指示器）
function TargetCircle({
  children,
  active = false,
  position,
}: {
  children: React.ReactNode;
  active?: boolean;
  position: "top" | "left";
}) {
  const positionClasses = {
    top: "top-[19px] left-1/2 -translate-x-1/2",
    left: "left-[19px] top-1/2 -translate-y-1/2",
  };

  return (
    <div className={`absolute ${positionClasses[position]} w-[32px] h-[32px] rounded-full flex items-center justify-center transition-all duration-200 ${active ? "bg-white/30" : ""}`}>
      <div className={`w-[24px] h-[24px] rounded-full border-[1.5px] transition-colors duration-200 flex items-center justify-center ${active ? "border-current" : "border-[#A0A0A0]"}`}>
        {children}
      </div>
    </div>
  );
}

// 收起指示器（小横线）
function CollapseIndicator({ position }: { position: "right" | "bottom" }) {
  const isRight = position === "right";
  return (
    <div className={`absolute ${isRight ? "right-[72px] top-1/2 -translate-y-1/2" : "bottom-[72px] left-1/2 -translate-x-1/2"}`}>
      <div className={`bg-[#A0A0A0] rounded-full ${isRight ? "w-[4px] h-[1.5px]" : "w-[1.5px] h-[4px]"}`} />
    </div>
  );
}

// ==========================================
// 4. 主组件
// ==========================================

interface VoiceGestureProps {
  onStateChange?: (state: InteractionState) => void;
  onTranscription?: (text: string) => void;
}

export default function VoiceGesture({ onStateChange, onTranscription }: VoiceGestureProps) {
  // ==========================================
  // 状态管理：严格对应 Figma 变体
  // ==========================================
  const [interactionState, setInteractionState] = useState<InteractionState>("Idle");
  
  // 记录按压起始位置，用于计算位移
  const startPosRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // 手势识别逻辑
  // ==========================================
  
  /**
   * 根据手指位移判断当前悬停区域
   * 
   * 坐标系说明：
   * - deltaX: 正值 = 向右移动, 负值 = 向左移动
   * - deltaY: 正值 = 向下移动, 负值 = 向上移动
   * 
   * 区域判定逻辑：
   * ┌─────────────────────────────────────┐
   * │         🔒 LOCK ZONE               │
   * │      (deltaY < -50 像素)            │
   * │      当 Y 轴负向位移超过阈值         │
   * ├───────────┬─────────────────────────┤
   * │ 🗑️ CANCEL │                        │
   * │   ZONE    │      NEUTRAL           │
   * │(deltaX <  │       ZONE             │
   * │ -50 像素)  │    (按压中心)           │
   * │           │                        │
   * └───────────┴─────────────────────────┘
   * 
   * 优先级：Lock > Cancel > Pressing
   * 这样设计是因为"锁定"是更主动的操作，应该更容易触发
   */
  const calculateZone = useCallback((clientX: number, clientY: number): InteractionState => {
    const deltaX = clientX - startPosRef.current.x;
    const deltaY = clientY - startPosRef.current.y;
    
    // 定义触发阈值（像素）
    const LOCK_THRESHOLD = -50;    // 向上滑动 50px 触发锁定
    const CANCEL_THRESHOLD = -50;  // 向左滑动 50px 触发取消
    
    // ==========================================
    // 区域判定算法
    // ==========================================
    
    // 1. 检查是否进入 Lock Zone（顶部）
    //    条件：Y 轴负向位移 > 阈值，且 X 轴位移在合理范围内
    if (deltaY < LOCK_THRESHOLD && Math.abs(deltaX) < Math.abs(deltaY)) {
      // deltaY 是负数（向上）
      // 确保主要是垂直移动（|deltaX| < |deltaY|）
      console.log(`📍 [Gesture] Lock Zone - deltaY: ${deltaY.toFixed(0)}px`);
      return "Hover_Lock";
    }
    
    // 2. 检查是否进入 Cancel Zone（左侧）
    //    条件：X 轴负向位移 > 阈值，且 Y 轴位移在合理范围内
    if (deltaX < CANCEL_THRESHOLD && Math.abs(deltaY) < Math.abs(deltaX)) {
      // deltaX 是负数（向左）
      // 确保主要是水平移动（|deltaY| < |deltaX|）
      console.log(`📍 [Gesture] Cancel Zone - deltaX: ${deltaX.toFixed(0)}px`);
      return "Hover/Cancel";
    }
    
    // 3. 默认保持 Pressing 状态（中心区域）
    return "Pressing";
  }, []);

  // ==========================================
  // 事件处理器
  // ==========================================

  /**
   * 按压开始 → 进入 Pressing 状态
   */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // 捕获指针，确保后续事件能追踪到
    e.currentTarget.setPointerCapture(e.pointerId);
    
    // 记录起始位置
    startPosRef.current = { x: e.clientX, y: e.clientY };
    
    // 切换到 Pressing 状态
    setInteractionState("Pressing");
    onStateChange?.("Pressing");
    
    // 🎤 开始录音
    startRecording();
  }, [onStateChange]);

  /**
   * 移动中 → 实时计算区域
   */
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // 只在非 Idle 状态下处理
    if (interactionState === "Idle") return;
    
    // 计算当前所在区域
    const newState = calculateZone(e.clientX, e.clientY);
    
    // 只在状态变化时更新（避免不必要的重渲染）
    if (newState !== interactionState) {
      setInteractionState(newState);
      onStateChange?.(newState);
    }
  }, [interactionState, calculateZone, onStateChange]);

  /**
   * 释放 → 根据最终状态执行操作
   */
  const handlePointerUp = useCallback(async () => {
    const finalState = interactionState;
    
    // 重置到 Idle 状态
    setInteractionState("Idle");
    onStateChange?.("Idle");
    
    // 根据最终状态决定操作
    switch (finalState) {
      case "Hover/Cancel":
        // 🚫 用户取消 → 丢弃录音
        console.log("🚫 [VoiceHUD] 用户取消录音");
        await stopRecording(true);
        break;
        
      case "Hover_Lock":
        // 🔒 用户锁定 → 继续录音（不在此处停止）
        console.log("🔒 [VoiceHUD] 用户锁定录音模式");
        // TODO: 实现锁定模式的逻辑
        // 锁定模式下，用户可以松开手指继续说话
        // 需要另一个按钮来停止录音
        break;
        
      case "Pressing":
      default:
        // ✅ 正常释放 → 停止录音并发送
        console.log("✅ [VoiceHUD] 正常结束录音");
        await stopRecording(false);
        break;
    }
  }, [interactionState, onStateChange]);

  // ==========================================
  // 渲染逻辑：根据状态切换组件变体
  // ==========================================
  
  const isExpanded = interactionState !== "Idle";

  return (
    <div
      ref={containerRef}
      className="relative transition-all duration-200"
      style={{ 
        width: isExpanded ? 240 : 62, 
        height: isExpanded ? 240 : 62,
        // 展开时需要向左上偏移以保持中心按钮位置
        transform: isExpanded ? "translate(-89px, -89px)" : "none",
      }}
    >
      <AnimatePresence mode="wait">
        {isExpanded ? (
          /* ===== 展开状态变体: Pressing / Hover_Lock / Hover_Cancel ===== */
          <motion.div
            key="expanded"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute inset-0"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* 背景圆形面板 */}
            <div className="absolute inset-[10px] rounded-full bg-[#E8E8E8] shadow-[0px_5px_20px_rgba(0,0,0,0.1)]" />

            {/* 🔒 Lock 目标区域 (顶部) */}
            <TargetCircle position="top" active={interactionState === "Hover_Lock"}>
              <LockIcon active={interactionState === "Hover_Lock"} />
            </TargetCircle>

            {/* 🗑️ Cancel 目标区域 (左侧) */}
            <TargetCircle position="left" active={interactionState === "Hover/Cancel"}>
              <DiscardIcon active={interactionState === "Hover/Cancel"} />
            </TargetCircle>

            {/* 收起指示器 */}
            <CollapseIndicator position="right" />
            <CollapseIndicator position="bottom" />

            {/* 中心语音按钮 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-[62px] h-[62px] rounded-full bg-[#282828] flex items-center justify-center shadow-xl"
                animate={{ 
                  scale: interactionState === "Pressing" ? 1.05 : 1,
                }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <VoiceIcon className="text-white" />
              </motion.div>
            </div>
            
            {/* 当前状态指示器（调试用，可删除） */}
            <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 text-[10px] text-gray-500 font-mono">
              {interactionState}
            </div>
          </motion.div>
        ) : (
          /* ===== Idle 状态变体 ===== */
          <motion.button
            key="idle"
            type="button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onPointerDown={handlePointerDown}
            className="absolute inset-0 w-[62px] h-[62px] rounded-full bg-[#282828] flex items-center justify-center shadow-2xl cursor-pointer touch-none"
            style={{
              boxShadow: "0 0 40px rgba(0, 0, 0, 0.15), 0 10px 30px rgba(0, 0, 0, 0.2)",
            }}
          >
            <VoiceIcon className="text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}















