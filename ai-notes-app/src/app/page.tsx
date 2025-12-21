"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import NavigationBar from "@/components/NavigationBar";
import FloatingActionBar from "@/components/FloatingActionBar";
import VoiceHUD from "@/components/VoiceHUD";
import { NoteBlock, BlockData } from "@/components/NoteBlock";
import { AIProcessingBar } from "@/components/AIProcessingBar";

const INITIAL_BLOCKS: BlockData[] = [
  { id: "1", type: "h1", content: "竞品深度调研" },
  { id: "2", type: "p", content: "3. 市场分类与竞品深度调研" },
  { id: "3", type: "p", content: "基于对市面产品的广泛扫描，我们将符合\"文本输入 Copilot\"形态的应用分为以下四类。" },
  { id: "4", type: "p", content: "第一类： 原生 AI 编辑器 (The Native AI Editors)" },
  { id: "5", type: "p", content: "定义： 这类应用从底层架构上就是为 AI 协作而生。它们通常由独立的创业团队开发，没有历史包袱，能够极其激进地探索\"Ghost Text\"等交互形式。这是最接近您「Cursor for Mobile」构想的类别。" },
];

const pageVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: "easeOut" as const },
  },
};

export default function Page() {
  const [blocks, setBlocks] = useState<BlockData[]>(INITIAL_BLOCKS);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTranscription = useCallback((text: string) => {
    const newBlock: BlockData = {
      id: Date.now().toString(),
      type: "p",
      content: text,
    };
    setBlocks((prev) => [...prev, newBlock]);
  }, []);

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-gray-200 md:py-10 overflow-hidden">
      {/* The Viewport Container - Mobile App Architecture */}
      <div
        className="
          relative 
          w-full max-w-[393px] 
          h-full md:h-[852px] 
          bg-[#F5F5F7] shadow-xl 
          overflow-hidden mx-auto 
          flex flex-col
        "
        style={{
          fontFamily:
            '"PingFang SC", -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Layer 1: Header (Fixed Height, No Scroll) */}
        <header className="flex-none z-50 bg-[#F5F5F7]">
          <NavigationBar />
        </header>

        {/* Layer 2: Content Area (占据剩余空间，独立滚动) */}
        <div className="flex-1 overflow-y-auto no-scrollbar z-10 overscroll-contain scrollable-content">
          <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            className="pt-6 pb-[160px] px-6 article-content"
          >
            {/* Text Content - Blocks inside scrollable area */}
            <article className="bg-transparent text-[#000000] flex flex-col gap-4">
              {blocks.map((block) => (
                <NoteBlock key={block.id} block={block} />
              ))}
            </article>
          </motion.div>
        </div>

        {/* Layer 3: Overlays (Pinned to Bottom, Floating above content) */}
        
        {/* Navigation/Action Bar Dock */}
        <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none">
          <FloatingActionBar />
        </div>

        {/* AI Processing Bar */}
        <AnimatePresence>
          {isProcessing && <AIProcessingBar />}
        </AnimatePresence>

        {/* VoiceHUD Overlay (Core Interaction) */}
        <div className="absolute bottom-0 left-0 right-0 z-[100] pointer-events-none">
          <VoiceHUD 
            onTranscription={handleTranscription}
            onProcessing={setIsProcessing}
          />
        </div>
      </div>
    </main>
  );
}
