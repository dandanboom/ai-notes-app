"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// 思考步骤文案库
const LOADING_STEPS = [
  "正在聆听...",
  "正在分析意图...",
  "正在搜索上下文...",
  "正在为这顿美食寻找最诱人的形容词...",
  "正在整理笔记结构...",
  "正在生成内容...",
  "优化排版格式...",
];

// 双轨点阵 Spinner 组件
const DualRingSpinner: React.FC = () => {
  // 外圈点数和内圈点数
  const outerDots = 10;
  const innerDots = 6;
  const outerRadius = 10;
  const innerRadius = 5;
  const dotSize = 1.8;

  // 生成圆环上的点
  const generateDots = (count: number, radius: number, size: number) => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      const x = 12 + radius * Math.cos(angle);
      const y = 12 + radius * Math.sin(angle);
      // 点的透明度渐变，形成拖尾效果
      const opacity = 0.3 + (i / count) * 0.7;
      return { x, y, size, opacity };
    });
  };

  const outerDotsData = generateDots(outerDots, outerRadius, dotSize);
  const innerDotsData = generateDots(innerDots, innerRadius, dotSize * 0.9);

  return (
    <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
      {/* 外圈 - 顺时针旋转 */}
      <div className="absolute inset-0 animate-spin-slow">
        <svg viewBox="0 0 24 24" className="w-full h-full">
          {outerDotsData.map((dot, i) => (
            <circle
              key={`outer-${i}`}
              cx={dot.x}
              cy={dot.y}
              r={dot.size}
              fill="#1a1a1a"
              opacity={dot.opacity}
            />
          ))}
        </svg>
      </div>

      {/* 内圈 - 逆时针旋转（更快） */}
      <div className="absolute inset-0 animate-spin-reverse">
        <svg viewBox="0 0 24 24" className="w-full h-full">
          {innerDotsData.map((dot, i) => (
            <circle
              key={`inner-${i}`}
              cx={dot.x}
              cy={dot.y}
              r={dot.size}
              fill="#1a1a1a"
              opacity={dot.opacity}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

export const AIProcessingBar: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);

  // 模拟思考步骤轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1500); // 每 1.5s 切换一条文案

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50"
    >
      {/* 胶囊容器 */}
      <div
        className="
          flex items-center gap-4
          bg-white
          px-6 py-3
          rounded-full
          shadow-[0_8px_30px_rgba(0,0,0,0.12)]
          border border-gray-100
          min-w-[280px]
          max-w-[340px]
        "
      >
        {/* 左侧：双轨旋转点阵 */}
        <DualRingSpinner />

        {/* 右侧：滚动思考日志 */}
        <div className="flex-1 h-6 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0 flex items-center text-sm font-medium text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis"
            >
              {LOADING_STEPS[stepIndex]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
