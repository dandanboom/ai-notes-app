/**
 * Note/Block Types
 * 
 * These types define the structure of notes in the application.
 * They are used by both the frontend (Zustand store) and can be
 * mapped to/from the Prisma database models.
 */

/**
 * TextBlock - The atomic unit of content in the editor
 * 
 * This is the client-side representation of a Note.
 * It maps to the Prisma `Note` model but uses simpler types for React.
 */
export interface TextBlock {
  /** Unique identifier (UUID) */
  id: string;
  /** Markdown content */
  content: string;
  /** Whether the block is empty (for UI optimization) */
  isEmpty: boolean;
}

/**
 * Create a new TextBlock with default values
 */
export function createTextBlock(content: string = ""): TextBlock {
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content,
    isEmpty: content.trim() === "",
  };
}

/**
 * Review State - Used when AI suggests modifications
 */
export interface ReviewState {
  /** Block ID being reviewed, null for full document review */
  blockId: string | null;
  /** The AI response containing the suggested content */
  response: import("./ai").AIResponse;
  /** Original content before modification */
  originalContent: string;
}

/**
 * Chat Message - Used in clarification dialog
 */
export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: number;
}

/**
 * Convert blocks to Markdown string
 */
export function blocksToMarkdown(blocks: TextBlock[]): string {
  return blocks.map((b) => b.content).join("\n\n");
}

/**
 * Parse Markdown string to blocks
 * Simple implementation: split by double newlines
 */
export function parseMarkdownToBlocks(markdown: string): TextBlock[] {
  if (!markdown.trim()) {
    return [createTextBlock("")];
  }
  
  const parts = markdown.split(/\n\n+/).filter((p) => p.trim());
  
  if (parts.length === 0) {
    return [createTextBlock("")];
  }
  
  return parts.map((content) => createTextBlock(content));
}




