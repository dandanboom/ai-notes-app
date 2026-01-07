"use client";

import React from "react";
import { Undo2, Redo2, Plus } from "lucide-react";
import { GlassButton } from "./GlassButton";

/* ============================================
   FLOATING ACTION BAR
   
   只包含左侧的 Glass Buttons (Undo/Redo/Plus)
   VoiceHUD 作为独立的 Overlay 组件在页面层级添加
   ============================================ */

interface FloatingActionBarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  onAdd?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export default function FloatingActionBar({
  onUndo,
  onRedo,
  onAdd,
  canUndo = false,
  canRedo = false,
}: FloatingActionBarProps) {
  return (
    <div className="relative w-full h-[120px] pointer-events-none">
      {/* 1. Gradient Mask (Transparent to Background Color) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/90 to-transparent" />

      {/* 2. Interaction Layer */}
      <div className="relative w-full h-full">
        
        {/* Left Actions (Glass Buttons) */}
        <div className="absolute left-[16px] bottom-[28px] flex gap-3 pointer-events-auto">
          <GlassButton 
            icon={Undo2} 
            onClick={onUndo}
            disabled={!canUndo}
          />
          <GlassButton 
            icon={Redo2} 
            onClick={onRedo}
            disabled={!canRedo}
          />
          <GlassButton 
            icon={Plus} 
            onClick={onAdd}
          />
        </div>

        {/* 
          Right Action 已移至独立的 VoiceHUD Overlay 组件
          这样做是因为 VoiceHUD 需要展开为全屏叠加层
          在页面层级通过 <VoiceHUD /> 添加
        */}
      </div>
    </div>
  );
}












