/**
 * Markdown Parser Utilities
 * 
 * Re-exports from @/types/note for backward compatibility.
 * New code should import directly from @/types/note.
 */

// Re-export types and functions from the centralized location
export type { TextBlock } from "@/types/note";
export { 
  parseMarkdownToBlocks, 
  blocksToMarkdown,
  createTextBlock,
} from "@/types/note";


