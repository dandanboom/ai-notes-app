"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil } from "lucide-react";

export type BlockType = "h1" | "p" | "list-item" | "ghost";

export interface BlockData {
  id: string;
  type: BlockType;
  content: string;
}

interface NoteBlockProps {
  block: BlockData;
  onEdit?: (id: string, newContent: string) => void;
}

export const NoteBlock: React.FC<NoteBlockProps> = ({ block, onEdit }) => {
  const [isHovered, setIsHovered] = useState(false);

  const renderContent = () => {
    switch (block.type) {
      case "h1":
        return <h1 className="text-[24px] leading-[28px] font-semibold mb-5">{block.content}</h1>;
      case "list-item":
        return (
          <li className="list-disc list-outside ml-5 space-y-3">
            <span className="text-[15px] leading-[24px] font-normal">{block.content}</span>
          </li>
        );
      case "ghost":
        return (
          <span className="text-gray-400 italic animate-pulse">
            {block.content}
          </span>
        );
      default:
        return <p className="text-[15px] leading-[24px] font-normal">{block.content}</p>;
    }
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderContent()}
      
      <AnimatePresence>
        {isHovered && block.type !== "ghost" && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -right-8 top-1 p-1 bg-white shadow-sm rounded-full border border-gray-100 text-gray-400 hover:text-black transition-colors"
            onClick={() => console.log("Inline edit triggered for", block.id)}
          >
            <Pencil size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};


