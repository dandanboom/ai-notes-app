"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export const AIProcessingBar: React.FC = () => {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] z-[60] pointer-events-auto"
    >
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 shadow-xl rounded-full h-[56px] px-6 flex items-center gap-4">
        <div className="relative">
          <Sparkles className="text-purple-500 animate-pulse" size={20} />
        </div>
        
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-medium text-gray-700">正在为这篇简报搜集最具人气的移动端交互细节...</span>
            <span className="text-[11px] text-gray-400 tabular-nums">75%</span>
          </div>
          
          <div className="h-[3px] w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "75%" }}
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};


