"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface GlassButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({ 
  icon: Icon, 
  onClick, 
  className,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center
        w-[48px] h-[48px] rounded-full
        transition-all active:scale-95
        
        /* --- THE NEW LIQUID PHYSICS RECIPE --- */
        
        /* 1. Base Transparency & Blur (Much clearer than before) */
        /* Use a gradient: milky at top, clearer at bottom */
        bg-gradient-to-b from-white/80 to-white/40
        backdrop-blur-[20px]
        
        /* 2. Crisp Edge Definition */
        border border-white/60
        
        /* 3. THE KEY: Sharp Specular "Rim Light" (Top Inner Reflection) */
        /* The first shadow creates the sharp white line at the top inside edge */
        /* The second shadow is the soft drop shadow for lift */
        shadow-[inset_0px_1px_0px_rgba(255,255,255,0.9),_0px_4px_16px_rgba(0,0,0,0.12)]
        
        /* ------------------------------------- */
        
        /* Disabled state */
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
        
        ${className || ""}
      `}
    >
      {/* Slightly darker icon for better contrast against the bright glass */}
      <Icon size={22} className={disabled ? "text-black/40" : "text-black/90"} />
    </button>
  );
};












