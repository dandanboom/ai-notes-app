# AI Notes App - 完整架构与代码导出

> 生成时间: 2024年12月19日
> 技术栈: Next.js 16 + React 19 + TypeScript + Supabase + Prisma + Zustand

---

## 📁 项目结构

```
ai-notes-app/
├── prisma/
│   └── schema.prisma           # 数据库模型定义
├── prisma.config.ts            # Prisma 7+ 配置
├── src/
│   ├── app/
│   │   ├── actions.ts          # AI 语音处理 Server Actions
│   │   ├── actions/
│   │   │   └── noteActions.ts  # 笔记 CRUD Server Actions
│   │   ├── auth/
│   │   │   └── callback/route.ts  # OAuth 回调
│   │   ├── login/page.tsx      # 登录页面
│   │   ├── page.tsx            # 主页面
│   │   ├── layout.tsx          # 根布局
│   │   └── globals.css         # 全局样式
│   ├── components/
│   │   ├── AIProcessingBar.tsx # AI 处理状态栏
│   │   ├── AuthGuard.tsx       # 认证守卫
│   │   ├── ClarificationModal.tsx  # AI 追问对话框
│   │   ├── EditorBlock.tsx     # 编辑器块组件
│   │   ├── FloatingActionBar.tsx   # 底部操作栏
│   │   ├── GlassButton.tsx     # 玻璃态按钮
│   │   ├── InlineVoicePanel.tsx    # 行内语音面板
│   │   ├── NavigationBar.tsx   # 导航栏
│   │   ├── ReviewBlock.tsx     # Diff 视图块
│   │   ├── ReviewCard.tsx      # Review 操作卡片
│   │   └── VoiceHUD/index.tsx  # 语音交互核心组件
│   ├── hooks/
│   │   ├── useAuth.ts          # 认证 Hook
│   │   ├── useAutoSave.ts      # 自动保存 Hook
│   │   └── useRecorder.ts      # 录音 Hook
│   ├── lib/
│   │   ├── prisma.ts           # Prisma 客户端
│   │   └── supabase/
│   │       ├── client.ts       # 浏览器端 Supabase
│   │       ├── server.ts       # 服务端 Supabase
│   │       └── middleware.ts   # 中间件辅助
│   ├── services/
│   │   └── noteService.ts      # 数据库服务层
│   ├── store/
│   │   └── noteStore.ts        # Zustand 状态管理
│   ├── types/
│   │   ├── ai.ts               # AI 响应类型
│   │   └── note.ts             # 笔记类型
│   ├── utils/
│   │   └── markdownParser.ts   # Markdown 解析
│   └── middleware.ts           # Next.js 中间件
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  page.tsx ─────▶ Components ─────▶ useNoteStore (Zustand)       │
│      │              │                    │                       │
│      │              │                    ▼                       │
│      │              │           localStorage (persist)           │
│      │              │                                            │
│      ▼              ▼                                            │
│  VoiceHUD ────▶ useRecorder ────▶ Server Actions                │
├─────────────────────────────────────────────────────────────────┤
│                      Server Actions (Next.js)                    │
├─────────────────────────────────────────────────────────────────┤
│  actions.ts ────▶ Gemini API (AI Processing)                    │
│                                                                  │
│  noteActions.ts ────▶ noteService.ts ────▶ Prisma ────▶ Supabase│
├─────────────────────────────────────────────────────────────────┤
│                        Database (Supabase)                       │
├─────────────────────────────────────────────────────────────────┤
│  user_profiles  │  notebooks  │  notes                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 依赖配置

### package.json

```json
{
  "name": "ai-notes-app",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": ">=20.9.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@prisma/client": "^7.2.0",
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.89.0",
    "@types/diff": "^7.0.2",
    "diff": "^8.0.2",
    "framer-motion": "^12.23.26",
    "lucide-react": "^0.562.0",
    "next": "16.0.10",
    "react": "19.2.1",
    "react-dom": "19.2.1",
    "react-markdown": "^9.0.1",
    "react-textarea-autosize": "^8.5.9",
    "zustand": "^5.0.9"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@tailwindcss/typography": "^0.5.15",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "dotenv": "^17.2.3",
    "eslint": "^9",
    "eslint-config-next": "16.0.10",
    "prisma": "^7.2.0",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

### next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

---

## 🗄️ 数据库层

### prisma/schema.prisma

```prisma
// Prisma Schema for AI Notes App
// Database: Supabase PostgreSQL
// 注意: Prisma 7+ 的数据库 URL 配置在 prisma.config.ts 中

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// ============================================
// User Profile
// Links to Supabase Auth via auth.users.id
// ============================================
model UserProfile {
  id        String   @id @default(uuid()) @db.Uuid
  authId    String   @unique @map("auth_id") @db.Uuid // Supabase Auth user ID
  email     String?
  name      String?
  avatarUrl String?  @map("avatar_url")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  notebooks Notebook[]

  @@map("user_profiles")
}

// ============================================
// Notebook
// A container for Notes (like a folder)
// ============================================
model Notebook {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  title       String   @default("Untitled Notebook")
  description String?
  emoji       String?  @default("📝") // Icon for the notebook
  isArchived  Boolean  @default(false) @map("is_archived")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  user  UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)
  notes Note[]

  @@index([userId])
  @@map("notebooks")
}

// ============================================
// Note
// The atomic unit of content (maps to TextBlock)
// ============================================
model Note {
  id         String   @id @default(uuid()) @db.Uuid
  notebookId String   @map("notebook_id") @db.Uuid
  content    String   @default("") // Markdown content
  type       NoteType @default(PARAGRAPH) // Type of the block
  order      Int      @default(0) // Position in the notebook
  isEmpty    Boolean  @default(true) @map("is_empty")
  metadata   Json?    // For future extensibility (e.g., AI processing info)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  // Relations
  notebook Notebook @relation(fields: [notebookId], references: [id], onDelete: Cascade)

  @@index([notebookId, order])
  @@map("notes")
}

// ============================================
// Note Types (for future extensibility)
// ============================================
enum NoteType {
  HEADING_1
  HEADING_2
  HEADING_3
  PARAGRAPH
  BULLET_LIST
  NUMBERED_LIST
  QUOTE
  CODE_BLOCK
  DIVIDER
}
```

### prisma.config.ts

```typescript
/**
 * Prisma 配置文件 (Prisma 7+)
 */

import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { resolve } from "path";

// 加载环境变量
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
```

### src/lib/prisma.ts

```typescript
/**
 * Prisma 客户端单例
 * 
 * 在开发环境中避免热重载时创建多个 Prisma 实例
 * 生产环境中正常创建单个实例
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

### src/services/noteService.ts

```typescript
/**
 * Note 数据库服务层
 * 
 * 封装所有与笔记相关的数据库操作
 * 使用 Prisma ORM 进行类型安全的数据库访问
 */

import prisma from "@/lib/prisma";
import type { Note, Notebook, NoteType } from "@prisma/client";

// ============================================
// 类型定义
// ============================================

export interface CreateNoteInput {
  notebookId: string;
  content: string;
  type?: NoteType;
  order?: number;
}

export interface UpdateNoteInput {
  content?: string;
  type?: NoteType;
  order?: number;
  isEmpty?: boolean;
}

export interface CreateNotebookInput {
  userId: string;
  title?: string;
  description?: string;
  emoji?: string;
}

// ============================================
// Notebook 操作
// ============================================

/**
 * 获取用户的所有笔记本
 */
export async function getNotebooksByUserId(userId: string): Promise<Notebook[]> {
  return prisma.notebook.findMany({
    where: { userId, isArchived: false },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * 获取单个笔记本（包含笔记）
 */
export async function getNotebookWithNotes(notebookId: string) {
  return prisma.notebook.findUnique({
    where: { id: notebookId },
    include: {
      notes: {
        orderBy: { order: "asc" },
      },
    },
  });
}

/**
 * 创建新笔记本
 */
export async function createNotebook(input: CreateNotebookInput): Promise<Notebook> {
  return prisma.notebook.create({
    data: {
      userId: input.userId,
      title: input.title ?? "未命名笔记",
      description: input.description,
      emoji: input.emoji ?? "📝",
    },
  });
}

/**
 * 更新笔记本
 */
export async function updateNotebook(
  notebookId: string,
  data: Partial<Pick<Notebook, "title" | "description" | "emoji" | "isArchived">>
): Promise<Notebook> {
  return prisma.notebook.update({
    where: { id: notebookId },
    data,
  });
}

/**
 * 删除笔记本（级联删除所有笔记）
 */
export async function deleteNotebook(notebookId: string): Promise<void> {
  await prisma.notebook.delete({
    where: { id: notebookId },
  });
}

// ============================================
// Note 操作
// ============================================

/**
 * 获取笔记本中的所有笔记
 */
export async function getNotesByNotebookId(notebookId: string): Promise<Note[]> {
  return prisma.note.findMany({
    where: { notebookId },
    orderBy: { order: "asc" },
  });
}

/**
 * 获取单个笔记
 */
export async function getNoteById(noteId: string): Promise<Note | null> {
  return prisma.note.findUnique({
    where: { id: noteId },
  });
}

/**
 * 创建新笔记
 */
export async function createNote(input: CreateNoteInput): Promise<Note> {
  // 如果没有指定 order，获取当前最大 order 值 +1
  let order = input.order;
  if (order === undefined) {
    const maxOrderNote = await prisma.note.findFirst({
      where: { notebookId: input.notebookId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    order = (maxOrderNote?.order ?? -1) + 1;
  }

  return prisma.note.create({
    data: {
      notebookId: input.notebookId,
      content: input.content,
      type: input.type ?? "PARAGRAPH",
      order,
      isEmpty: input.content.trim() === "",
    },
  });
}

/**
 * 更新笔记
 */
export async function updateNote(noteId: string, input: UpdateNoteInput): Promise<Note> {
  const data: UpdateNoteInput = { ...input };
  
  // 如果更新了 content，自动更新 isEmpty
  if (input.content !== undefined) {
    data.isEmpty = input.content.trim() === "";
  }

  return prisma.note.update({
    where: { id: noteId },
    data,
  });
}

/**
 * 删除笔记
 */
export async function deleteNote(noteId: string): Promise<void> {
  await prisma.note.delete({
    where: { id: noteId },
  });
}

/**
 * 批量更新笔记（用于重排序）
 */
export async function batchUpdateNotes(
  updates: Array<{ id: string; order: number }>
): Promise<void> {
  await prisma.$transaction(
    updates.map((update) =>
      prisma.note.update({
        where: { id: update.id },
        data: { order: update.order },
      })
    )
  );
}

/**
 * 批量创建笔记（用于导入或替换全部）
 */
export async function batchCreateNotes(
  notebookId: string,
  notes: Array<{ content: string; type?: NoteType }>
): Promise<Note[]> {
  // 先删除现有笔记
  await prisma.note.deleteMany({
    where: { notebookId },
  });

  // 批量创建新笔记
  const createData = notes.map((note, index) => ({
    notebookId,
    content: note.content,
    type: note.type ?? ("PARAGRAPH" as NoteType),
    order: index,
    isEmpty: note.content.trim() === "",
  }));

  await prisma.note.createMany({
    data: createData,
  });

  // 返回新创建的笔记
  return prisma.note.findMany({
    where: { notebookId },
    orderBy: { order: "asc" },
  });
}

// ============================================
// UserProfile 操作
// ============================================

/**
 * 获取或创建用户配置
 * 当用户首次登录时调用
 */
export async function getOrCreateUserProfile(authId: string, email?: string, name?: string) {
  return prisma.userProfile.upsert({
    where: { authId },
    update: {
      email,
      name,
    },
    create: {
      authId,
      email,
      name,
    },
  });
}

/**
 * 获取用户配置
 */
export async function getUserProfileByAuthId(authId: string) {
  return prisma.userProfile.findUnique({
    where: { authId },
  });
}
```

---

## 🔐 认证层 (Supabase)

### src/lib/supabase/client.ts

```typescript
/**
 * Supabase 浏览器客户端
 * 
 * 用于客户端组件中的 Supabase 操作
 * 注意：此客户端只能在浏览器环境中使用
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### src/lib/supabase/server.ts

```typescript
/**
 * Supabase 服务端客户端
 * 
 * 用于 Server Components、Server Actions 和 Route Handlers
 * 支持 Cookie 管理以维护用户会话
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在 Server Component 中调用时会忽略设置 Cookie
          }
        },
      },
    }
  );
}
```

### src/lib/supabase/middleware.ts

```typescript
/**
 * Supabase 中间件辅助函数
 * 
 * 用于在中间件中刷新用户会话
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 刷新会话（如果过期）- 重要！
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabaseResponse;
}
```

### src/middleware.ts

```typescript
/**
 * Next.js 中间件
 * 
 * 主要功能：
 * 1. 刷新 Supabase 用户会话
 * 2. 路由保护（可选）
 */

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 需要登录的路由（目前设为空，允许匿名使用）
const protectedRoutes: string[] = [];

// 已登录用户应跳过的路由
const authRoutes = ["/login"];

export async function middleware(request: NextRequest) {
  // 刷新会话
  const response = await updateSession(request);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

---

## 📊 状态管理 (Zustand)

### src/store/noteStore.ts

```typescript
/**
 * Note Store - Zustand State Management
 * 
 * Centralized state management for the note editor.
 * Handles:
 * - Block CRUD operations
 * - Undo/Redo history
 * - Review mode state
 * - Clarification dialog state
 * - Ghost text predictions
 * - UI state (focus, processing)
 * - Database synchronization (with optimistic updates)
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { AIResponse } from "@/types/ai";
import type { TextBlock, ReviewState, ChatMessage } from "@/types/note";
import { createTextBlock, parseMarkdownToBlocks, blocksToMarkdown } from "@/types/note";

// ============================================
// Constants
// ============================================

const MAX_HISTORY_STEPS = 5;
const AUTO_SAVE_DELAY = 2000; // 2 seconds

// ============================================
// Store Interface
// ============================================

interface NoteState {
  // ===== Core Data =====
  blocks: TextBlock[];
  currentNotebookId: string | null;
  
  // ===== Sync State =====
  isSyncing: boolean;
  lastSyncedAt: number | null;
  syncError: string | null;
  
  // ===== History System (Undo/Redo) =====
  history: TextBlock[][];
  future: TextBlock[][];
  lastSavedSnapshot: string;
  
  // ===== Review Mode =====
  reviewState: ReviewState | null;
  
  // ===== Clarification Mode =====
  isClarifying: boolean;
  chatHistory: ChatMessage[];
  
  // ===== UI State =====
  isProcessing: boolean;
  focusedBlockId: string | null;
  forceEditBlockId: string | null;
  forceCursorPosition: number | undefined;
  ghostTexts: Record<string, string>;
  
  // ===== Computed Values =====
  getFullContent: () => string;
  getContextContent: () => string;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

interface NoteActions {
  // ===== Block CRUD =====
  setBlocks: (blocks: TextBlock[]) => void;
  addBlock: (content?: string) => void;
  updateBlock: (id: string, content: string) => void;
  insertBlockAfter: (afterId: string, content?: string) => void;
  deleteBlock: (id: string) => void;
  mergeWithPrevious: (id: string) => { previousBlockId: string; cursorPosition: number } | null;
  
  // ===== Notebook Management =====
  setCurrentNotebook: (notebookId: string | null) => void;
  loadNotebook: (notebookId: string, blocks: TextBlock[]) => void;
  
  // ===== Sync Actions =====
  setSyncing: (isSyncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  markSynced: () => void;
  
  // ===== History =====
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  
  // ===== Review Mode =====
  setReviewState: (state: ReviewState | null) => void;
  confirmReview: () => void;
  rejectReview: () => void;
  
  // ===== Clarification Mode =====
  setIsClarifying: (value: boolean) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  
  // ===== UI State =====
  setIsProcessing: (value: boolean) => void;
  setFocusedBlockId: (id: string | null) => void;
  setForceEdit: (blockId: string | null, cursorPosition?: number) => void;
  clearForceEdit: () => void;
  setGhostText: (blockId: string, text: string) => void;
  clearGhostText: (blockId: string) => void;
  
  // ===== Complex Actions =====
  handleAppendContent: (content: string) => void;
  handleBlockAIResponse: (blockId: string, response: AIResponse) => void;
  handleGlobalAIResponse: (response: AIResponse) => void;
  
  // ===== Reset =====
  reset: () => void;
}

type NoteStore = NoteState & NoteActions;

// ============================================
// Initial State
// ============================================

const initialState: Omit<NoteState, 'getFullContent' | 'getContextContent' | 'canUndo' | 'canRedo'> = {
  blocks: [createTextBlock("")],
  currentNotebookId: null,
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
  history: [],
  future: [],
  lastSavedSnapshot: "",
  reviewState: null,
  isClarifying: false,
  chatHistory: [],
  isProcessing: false,
  focusedBlockId: null,
  forceEditBlockId: null,
  forceCursorPosition: undefined,
  ghostTexts: {},
};

// ============================================
// Store Implementation
// ============================================

export const useNoteStore = create<NoteStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ===== Initial State =====
        ...initialState,

        // ===== Computed Values =====
        getFullContent: () => {
          return blocksToMarkdown(get().blocks);
        },
        
        getContextContent: () => {
          const { focusedBlockId, blocks } = get();
          if (focusedBlockId) {
            const block = blocks.find((b) => b.id === focusedBlockId);
            if (block && block.content.trim()) {
              return block.content;
            }
          }
          return blocksToMarkdown(blocks);
        },
        
        canUndo: () => get().history.length > 0,
        canRedo: () => get().future.length > 0,

        // ... (actions implementation - see full file)
      }),
      {
        name: "ai-notes-storage",
        partialize: (state) => ({
          blocks: state.blocks,
          currentNotebookId: state.currentNotebookId,
        }),
      }
    ),
    { name: "note-store" }
  )
);

// ============================================
// Selector Hooks
// ============================================

export const useBlocks = () => useNoteStore((state) => state.blocks);
export const useIsProcessing = () => useNoteStore((state) => state.isProcessing);
export const useReviewState = () => useNoteStore((state) => state.reviewState);
export const useIsClarifying = () => useNoteStore((state) => state.isClarifying);
export const useChatHistory = () => useNoteStore((state) => state.chatHistory);
export const useGhostTexts = () => useNoteStore((state) => state.ghostTexts);
export const useIsSyncing = () => useNoteStore((state) => state.isSyncing);
export const useSyncError = () => useNoteStore((state) => state.syncError);
```

---

## 🤖 AI 处理层

### src/types/ai.ts

```typescript
/**
 * AI 响应相关类型定义
 * 
 * 这些类型在客户端和服务端共享使用
 */

/**
 * AI 响应的结构化类型
 * 支持三种场景：新增内容、修改建议、追问澄清
 */
export interface AIResponse {
  /** 
   * 响应类型
   * - append: 新增内容
   * - review: 修改建议
   * - inquire: 追问澄清（信息不足时）
   */
  type: 'append' | 'review' | 'inquire';
  /** 
   * 内容字段
   * - append 模式: 新增的内容 (Markdown 格式)
   * - review 模式: 修改后的完整新段落 (Markdown 格式)
   * - inquire 模式: 追问问题（纯文本，显示给用户）
   */
  content: string;
  /** 
   * (必填) 用户说了什么 - AI 对用户语音/文本的理解
   * 用于在对话历史中显示用户消息气泡
   */
  userInput: string;
  /** (可选) AI 的简短思考，用于调试和理解意图 */
  thought?: string;
  /** (可选) 会话 ID，用于追问模式下保持上下文 */
  chat_id?: string;
}

/**
 * 类型守卫：检查返回值是否为错误字符串
 */
export function isErrorResponse(response: AIResponse | string): response is string {
  return typeof response === 'string' && response.startsWith('ERROR:');
}
```

### src/types/note.ts

```typescript
/**
 * Note/Block Types
 * 
 * These types define the structure of notes in the application.
 */

/**
 * TextBlock - The atomic unit of content in the editor
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
```

### src/app/actions.ts (核心 AI Server Action)

```typescript
"use server";

import type { AIResponse } from "@/types/ai";

// 重新导出类型，方便其他文件导入
export type { AIResponse } from "@/types/ai";

/**
 * Server Actions for AI Voice Processing
 * 
 * 使用原生 fetch 调用 Gemini API（支持自定义 Base URL）
 */

// API 配置
const getApiConfig = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("❌ [Server Action] GOOGLE_API_KEY 未设置！");
    throw new Error("GOOGLE_API_KEY 环境变量未设置");
  }
  
  const baseUrl = process.env.GOOGLE_BASE_URL || "https://generativelanguage.googleapis.com";
  const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
  
  return { apiKey, baseUrl, model };
};

/**
 * 将 File 转换为 Base64 字符串
 */
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * System Prompt - 笔记助手指令（全局模式）
 */
const SYSTEM_PROMPT = `你是一个智能的中文笔记助手。

## 输出格式（严格 JSON）

{
  "type": "append" | "review" | "inquire",
  "content": "内容或问题",
  "userInput": "用户说了什么（简洁复述）",
  "thought": "简短说明你的判断"
}

## 🎯 核心任务：区分"口述"和"指令"

### 判断规则（按顺序检查）

**Step 1: 是否包含具体内容？**
如果用户的话中包含：
- 具体的时间（3点、明天、下周一）
- 具体的事项（开会、买菜、写报告）
- 具体的数据（3个任务、100元、2小时）
- 描述性内容（今天很累、项目进展顺利）

→ **直接返回 type: "append"**，将内容整理成 Markdown

**Step 2: 是否是"生成/创建"类指令？**
关键词：帮我写、生成一个、做个计划、列个清单、创建一份

如果是，且**缺少关键参数**：
→ **返回 type: "inquire"**，追问 1-2 个核心问题

如果是，且**信息已充足**：
→ **返回 type: "append"**，直接生成内容

**Step 3: 是否是"修改"类指令？**
关键词：把这段改成、修改、润色、删掉、调整

→ **返回 type: "review"**，输出修改后的完整内容`;

/**
 * 行内编辑专用 System Prompt
 */
const INLINE_EDIT_SYSTEM_PROMPT = `你是一个文本处理引擎。

## 输出格式（严格 JSON）

{
  "transcription": "用户说的原话",
  "type": "review" | "append",
  "content": "处理后的文本",
  "userInput": "简洁复述"
}

## 执行规则

1. **先听写**：在 transcription 中记录用户原话
2. **再判断**：是修改指令还是新内容
3. **最后输出**：review 返回完整修改后文本，append 返回新内容

## 绝对禁止

- ❌ 禁止返回 inquire（API 已禁用）
- ❌ 禁止反问
- ❌ 禁止添加客套话`;

/**
 * 处理语音命令：使用原生 fetch 调用 Gemini API
 */
export async function processVoiceCommand(
  formData: FormData,
  contextContent?: string,
  chatHistory?: string
): Promise<AIResponse | string> {
  try {
    const audioFile = formData.get("audio") as File;
    if (!audioFile) {
      return "ERROR: 未找到音频文件";
    }

    const { apiKey, baseUrl, model } = getApiConfig();
    
    // Step 1: 将音频转为 Base64
    const base64Audio = await fileToBase64(audioFile);

    // Step 2: 构建请求 URL
    const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Step 3: 判断场景并准备 Prompt
    const hasContext = contextContent && contextContent.trim().length > 0;
    const hasChatHistory = chatHistory && chatHistory.trim().length > 0;
    const isInlineEditMode = hasContext && !hasChatHistory;

    let activeSystemPrompt: string;
    let userPrompt: string;
    let inlineEditSchema: any | undefined;

    if (isInlineEditMode) {
      activeSystemPrompt = INLINE_EDIT_SYSTEM_PROMPT;
      userPrompt = `CONTEXT (目标文本):\n\`\`\`markdown\n${contextContent}\n\`\`\`\n\nTASK: 听取音频指令，直接修改上述文本。`;
      
      // 强制 JSON Schema - 物理移除 inquire
      inlineEditSchema = {
        type: "OBJECT",
        properties: {
          transcription: { type: "STRING" },
          type: { type: "STRING", enum: ["review", "append"] },
          content: { type: "STRING" },
          userInput: { type: "STRING" }
        },
        required: ["transcription", "type", "content", "userInput"]
      };
    } else if (hasChatHistory) {
      activeSystemPrompt = SYSTEM_PROMPT;
      userPrompt = `## 对话历史\n${chatHistory}\n\n## 当前笔记上下文\n${hasContext ? contextContent : "(空)"}\n\n## 当前交互\n用户正在通过语音回答你之前的追问。`;
    } else {
      activeSystemPrompt = SYSTEM_PROMPT;
      userPrompt = hasContext 
        ? `上下文：\n${contextContent}\n\n用户指令：听取语音并整理成 Markdown 格式。`
        : `这是一份新笔记，请听取用户的语音并整理成 Markdown 格式。`;
    }

    // Step 4: 构建请求体
    const requestBody: any = {
      contents: [{
        parts: [
          { inline_data: { mime_type: audioFile.type || "audio/webm", data: base64Audio } },
          { text: userPrompt }
        ]
      }],
      generationConfig: {
        temperature: isInlineEditMode ? 0.2 : 0.4,
        response_mime_type: "application/json",
        response_schema: inlineEditSchema
      }
    };

    if (isInlineEditMode) {
      requestBody.systemInstruction = { parts: [{ text: activeSystemPrompt }] };
    } else {
      requestBody.contents[0].parts[1].text = `${activeSystemPrompt}\n\n---\n\n${userPrompt}`;
    }

    // Step 5: 发送请求
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `ERROR: API 请求失败 (${response.status}) - ${errorText}`;
    }

    const data = await response.json();
    const rawResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawResult) {
      return "ERROR: AI 返回内容为空";
    }

    // 解析 JSON
    try {
      const parsed = parseAIResponse(rawResult);
      return parsed;
    } catch (parseError) {
      return { type: "append", content: rawResult, userInput: "(语音输入)" };
    }
    
  } catch (error) {
    if (error instanceof Error) {
      return "ERROR: " + error.message;
    }
    return "ERROR: 处理语音命令时发生未知错误";
  }
}

/**
 * 处理纯文本指令
 */
export async function processTextCommand(
  text: string,
  contextContent?: string,
  chatHistory?: string
): Promise<AIResponse | string> {
  // ... 实现类似 processVoiceCommand
}

/**
 * 预测 Ghost Text (智能续写)
 */
export async function predictGhostText(
  currentContext: string
): Promise<string> {
  // ... 实现 Ghost Text 预测逻辑
}
```

---

## 🎨 UI 组件层

### src/app/page.tsx (主页面)

```typescript
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useMemo } from "react";
import NavigationBar from "@/components/NavigationBar";
import FloatingActionBar from "@/components/FloatingActionBar";
import VoiceHUD from "@/components/VoiceHUD";
import { EditorBlock } from "@/components/EditorBlock";
import { AIProcessingBar } from "@/components/AIProcessingBar";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewBlock } from "@/components/ReviewBlock";
import ClarificationModal from "@/components/ClarificationModal";
import { AuthGuard } from "@/components/AuthGuard";
import type { AIResponse } from "@/types/ai";
import { processTextCommand, predictGhostText } from "@/app/actions";
import { useNoteStore } from "@/store/noteStore";
import { useAutoSave } from "@/hooks/useAutoSave";

// Animation variants
const pageVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: "easeOut" as const },
  },
};

export default function Page() {
  // ===== Zustand Store =====
  const {
    blocks,
    history,
    future,
    reviewState,
    isClarifying,
    chatHistory,
    isProcessing,
    focusedBlockId,
    forceEditBlockId,
    forceCursorPosition,
    ghostTexts,
    // Actions
    updateBlock,
    insertBlockAfter,
    mergeWithPrevious,
    addBlock,
    undo,
    redo,
    saveSnapshot,
    clearForceEdit,
    setFocusedBlockId,
    setIsProcessing,
    setGhostText,
    clearGhostText,
    handleBlockAIResponse,
    handleGlobalAIResponse,
    confirmReview,
    rejectReview,
    addChatMessage,
    clearChatHistory,
    getContextContent,
    getFullContent,
  } = useNoteStore();

  // ===== Auto Save =====
  useAutoSave();

  // ... (callbacks and render logic)

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-gray-200 md:py-10 overflow-hidden">
      {/* The Viewport Container - Mobile App Architecture */}
      <div className="relative w-full max-w-[393px] h-full md:h-[852px] bg-[#F5F5F7] shadow-xl overflow-hidden mx-auto flex flex-col">
        {/* Header */}
        <header className="flex-none z-50 bg-[#F5F5F7]">
          <NavigationBar />
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar z-10">
          <motion.div variants={pageVariants} initial="hidden" animate="visible" className="pt-6 pb-64 px-6 pr-14">
            <article className="bg-transparent text-[#000000] flex flex-col gap-2">
              {/* Review Mode Diff (Full Document) */}
              {reviewState && reviewState.blockId === null && (
                <ReviewBlock originalContent={reviewState.originalContent} newContent={reviewState.response.content} />
              )}

              {/* Block Editor */}
              {blocks.map((block, index) => (
                <EditorBlock
                  key={block.id}
                  block={block}
                  onEdit={handleBlockEdit}
                  onAIResponse={handleBlockAIResponseWithGhost}
                  // ... other props
                />
              ))}
            </article>
          </motion.div>
        </div>

        {/* Overlays */}
        <AnimatePresence>
          {!isClarifying && !isProcessing && (
            <FloatingActionBar onUndo={undo} onRedo={redo} onAdd={addBlock} canUndo={history.length > 0} canRedo={future.length > 0} />
          )}
        </AnimatePresence>

        <AnimatePresence>{isProcessing && <AIProcessingBar />}</AnimatePresence>

        <VoiceHUD onAIResponse={handleGlobalAIResponseWithGhost} onTranscription={handleTranscription} onProcessing={setIsProcessing} contextContent={contextContent} chatHistory={chatHistoryString} />

        <AnimatePresence>
          {reviewState && <ReviewCard response={reviewState.response} originalContent={reviewState.originalContent} onConfirm={confirmReview} onReject={rejectReview} />}
        </AnimatePresence>

        <ClarificationModal isOpen={isClarifying} history={chatHistory} onSendText={handleClarificationSendText} onClear={clearChatHistory} />
      </div>
    </main>
  );
}
```

### src/app/login/page.tsx (登录页面)

```typescript
"use client";

/**
 * 登录页面
 * 
 * 支持邮箱登录和第三方 OAuth 登录
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithGitHub, signInWithGoogle, loading, error, clearError } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setMessage("");

    if (isSignUp) {
      const { data, error } = await signUpWithEmail(email, password);
      if (!error && data) {
        setMessage("注册成功！请检查邮箱确认链接。");
      }
    } else {
      const { error } = await signInWithEmail(email, password);
      if (!error) {
        router.push("/");
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">📝</div>
          <h1 className="text-2xl font-bold text-gray-900">AI Notes</h1>
          <p className="text-gray-500 mt-1">智能语音笔记</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ... form fields */}
        </form>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <button onClick={signInWithGitHub}>使用 GitHub 登录</button>
          <button onClick={signInWithGoogle}>使用 Google 登录</button>
        </div>
      </motion.div>
    </main>
  );
}
```

---

## 🎤 语音交互组件

### src/components/VoiceHUD/index.tsx

```typescript
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { processVoiceCommand } from "@/app/actions";
import { isErrorResponse, AIResponse } from "@/types/ai";

/* ============================================
   VOICE HUD SYSTEM
   
   核心语音交互组件
   支持：长按录音、手势取消、锁定模式
   ============================================ */

type InteractionState = "Idle" | "Pressing" | "Hover/Cancel" | "Hover_Lock" | "Locked";

interface VoiceHUDProps {
  onAIResponse?: (response: AIResponse) => void;
  onProcessing?: (isProcessing: boolean) => void;
  contextContent?: string;
  chatHistory?: string;
  onTranscription?: (text: string) => void;
}

export default function VoiceHUD({ onAIResponse, onProcessing, contextContent, chatHistory, onTranscription }: VoiceHUDProps) {
  const [interactionState, setInteractionState] = useState<InteractionState>("Idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // MediaRecorder 相关
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // 开始录音
  const startVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error("启动录音失败:", error);
    }
  }, []);

  // 停止录音并处理
  const stopVoice = useCallback(async (cancelled: boolean) => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    
    recorder.onstop = () => {
      setTimeout(async () => {
        if (cancelled || audioChunksRef.current.length === 0) {
          // 清理资源
          return;
        }

        try {
          onProcessing?.(true);
          
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", new File([audioBlob], "recording.webm", { type: "audio/webm" }));

          const result = await processVoiceCommand(formData, contextContent, chatHistory);

          if (isErrorResponse(result)) {
            setErrorMessage(result);
            return;
          }

          if (onAIResponse) {
            onAIResponse(result as AIResponse);
          } else if (onTranscription && (result as AIResponse).content) {
            onTranscription((result as AIResponse).content);
          }
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "处理失败");
        } finally {
          onProcessing?.(false);
        }
      }, 500);
    };

    recorder.stop();
  }, [onTranscription, onAIResponse, onProcessing, contextContent, chatHistory]);

  // 事件处理
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    // 500ms 长按开始录音
    setTimeout(() => {
      setInteractionState("Pressing");
      startVoice();
    }, 500);
  }, [startVoice]);

  const handlePointerUp = useCallback(async () => {
    const finalState = interactionState;
    setInteractionState("Idle");

    if (finalState === "Pressing") {
      await stopVoice(false);
    } else if (finalState === "Hover/Cancel") {
      await stopVoice(true);
    }
  }, [interactionState, stopVoice]);

  return (
    <div className="absolute bottom-[21px] right-[16px] z-[100] pointer-events-none">
      {/* Voice Button */}
      <motion.button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="relative z-10 pointer-events-auto w-[62px] h-[62px] rounded-full bg-[#282828] flex items-center justify-center shadow-2xl cursor-pointer touch-none select-none"
      >
        <VoiceIcon className="text-white" />
      </motion.button>
    </div>
  );
}
```

### src/hooks/useRecorder.ts

```typescript
"use client";

import { useState, useRef, useCallback } from "react";
import { processVoiceCommand } from "@/app/actions";
import { isErrorResponse, AIResponse } from "@/types/ai";

/**
 * 录音 Hook - 可复用的录音逻辑
 * 用于底部大按钮和行内小灰点的录音功能
 */
export interface UseRecorderOptions {
  onTranscription?: (text: string) => void;
  onAIResponse?: (response: AIResponse) => void;
  onProcessing?: (isProcessing: boolean) => void;
  onError?: (error: string) => void;
  contextContent?: string;
}

export interface UseRecorderReturn {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: (cancelled?: boolean) => Promise<void>;
  errorMessage: string | null;
}

export function useRecorder({
  onTranscription,
  onAIResponse,
  onProcessing,
  onError,
  contextContent,
}: UseRecorderOptions = {}): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error("启动录音失败:", error);
      onError?.(error instanceof Error ? error.message : "启动录音失败");
    }
  }, [onError]);

  // 停止录音并处理
  const stopRecording = useCallback(
    async (cancelled: boolean = false) => {
      if (!mediaRecorderRef.current) return;

      const recorder = mediaRecorderRef.current;

      recorder.onstop = () => {
        setTimeout(async () => {
          if (cancelled || audioChunksRef.current.length === 0) {
            setIsRecording(false);
            return;
          }

          try {
            onProcessing?.(true);
            
            const mimeType = recorder.mimeType || "audio/webm";
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            const formData = new FormData();
            const fileName = mimeType.includes("mp4") ? "recording.mp4" : "recording.webm";
            formData.append("audio", new File([audioBlob], fileName, { type: mimeType }));

            const result = await processVoiceCommand(formData, contextContent);

            if (isErrorResponse(result)) {
              setErrorMessage(result);
              onError?.(result);
              return;
            }

            const aiResponse = result as AIResponse;
            
            if (onAIResponse) {
              onAIResponse(aiResponse);
            } else if (onTranscription && aiResponse.content) {
              onTranscription(aiResponse.content);
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "处理录音失败";
            setErrorMessage(errorMsg);
            onError?.(errorMsg);
          } finally {
            onProcessing?.(false);
            setIsRecording(false);
          }
        }, 500);
      };

      recorder.stop();
    },
    [onTranscription, onAIResponse, onProcessing, onError, contextContent]
  );

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    errorMessage,
  };
}
```

---

## 🔧 Hooks

### src/hooks/useAuth.ts

```typescript
"use client";

/**
 * useAuth - 认证状态管理 Hook
 * 
 * 提供用户登录状态、登录/注册/登出功能
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const supabase = createClient();

  // 监听认证状态变化
  useEffect(() => {
    const getInitialUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setState({ user, loading: false, error: null });
      } catch (error) {
        setState({ user: null, loading: false, error: null });
      }
    };

    getInitialUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState((prev) => ({
          ...prev,
          user: session?.user ?? null,
          loading: false,
        }));
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // 邮箱登录
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setState((prev) => ({ ...prev, loading: false, error: error.message }));
        return { error };
      }

      setState((prev) => ({ ...prev, user: data.user, loading: false }));
      return { data };
    },
    [supabase.auth]
  );

  // 邮箱注册
  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setState((prev) => ({ ...prev, loading: false, error: error.message }));
        return { error };
      }

      setState((prev) => ({ ...prev, loading: false }));
      return { data };
    },
    [supabase.auth]
  );

  // GitHub OAuth 登录
  const signInWithGitHub = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setState((prev) => ({ ...prev, error: error.message }));
  }, [supabase.auth]);

  // Google OAuth 登录
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setState((prev) => ({ ...prev, error: error.message }));
  }, [supabase.auth]);

  // 登出
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, loading: false, error: null });
  }, [supabase.auth]);

  // 清除错误
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signInWithEmail,
    signUpWithEmail,
    signInWithGitHub,
    signInWithGoogle,
    signOut,
    clearError,
  };
}
```

### src/hooks/useAutoSave.ts

```typescript
"use client";

/**
 * useAutoSave - 自动保存 Hook
 * 
 * 监听 blocks 变化，自动同步到数据库
 * 使用防抖避免频繁请求
 */

import { useEffect, useRef, useCallback } from "react";
import { useNoteStore } from "@/store/noteStore";
import { syncNotes } from "@/app/actions/noteActions";

const AUTO_SAVE_DELAY = 2000; // 2 seconds

export function useAutoSave() {
  const {
    blocks,
    currentNotebookId,
    setSyncing,
    setSyncError,
    markSynced,
  } = useNoteStore();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedRef = useRef<string>("");

  const saveToDatabase = useCallback(async () => {
    if (!currentNotebookId) return;

    const currentJson = JSON.stringify(blocks);
    if (currentJson === lastSyncedRef.current) return;

    setSyncing(true);
    setSyncError(null);

    try {
      const result = await syncNotes(currentNotebookId, blocks);
      
      if (result.success) {
        lastSyncedRef.current = currentJson;
        markSynced();
      } else {
        setSyncError(result.error);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSyncing(false);
    }
  }, [blocks, currentNotebookId, setSyncing, setSyncError, markSynced]);

  // 监听 blocks 变化，防抖保存
  useEffect(() => {
    if (!currentNotebookId) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveToDatabase();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [blocks, currentNotebookId, saveToDatabase]);

  return { saveNow: saveToDatabase };
}
```

---

## 🎨 全局样式

### src/app/globals.css

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

html, body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

/* AI Processing Bar - 双轨旋转动画 */
@keyframes spin-reverse {
  from { transform: rotate(360deg); }
  to { transform: rotate(0deg); }
}

.animate-spin-reverse {
  animation: spin-reverse 1.5s linear infinite;
}

/* 外圈旋转速度稍慢 */
.animate-spin-slow {
  animation: spin 2.5s linear infinite;
}
```

---

## 🌍 环境变量

### .env.local (示例)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Database (Prisma)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Gemini AI
GOOGLE_API_KEY=your-google-api-key
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-3-flash-preview
```

---

## 📄 完整文件清单

| 文件路径 | 说明 | 行数 |
|---------|------|-----|
| `package.json` | 项目依赖配置 | 42 |
| `tsconfig.json` | TypeScript 配置 | 34 |
| `next.config.ts` | Next.js 配置 | 8 |
| `prisma.config.ts` | Prisma 7+ 配置 | 22 |
| `prisma/schema.prisma` | 数据库模型 | 90 |
| `src/app/layout.tsx` | 根布局 | 35 |
| `src/app/page.tsx` | 主页面 | 387 |
| `src/app/actions.ts` | AI Server Actions | 730 |
| `src/app/actions/noteActions.ts` | 笔记 CRUD Actions | 295 |
| `src/app/login/page.tsx` | 登录页面 | 172 |
| `src/app/auth/callback/route.ts` | OAuth 回调 | 27 |
| `src/app/globals.css` | 全局样式 | 42 |
| `src/store/noteStore.ts` | Zustand 状态管理 | 618 |
| `src/types/ai.ts` | AI 类型定义 | 50 |
| `src/types/note.ts` | 笔记类型定义 | 81 |
| `src/components/EditorBlock.tsx` | 编辑器块组件 | 667 |
| `src/components/VoiceHUD/index.tsx` | 语音交互核心 | 746 |
| `src/components/ClarificationModal.tsx` | AI 追问对话框 | 272 |
| `src/components/ReviewCard.tsx` | Review 操作卡片 | 150 |
| `src/components/ReviewBlock.tsx` | Diff 视图块 | 52 |
| `src/components/FloatingActionBar.tsx` | 底部操作栏 | 76 |
| `src/components/AIProcessingBar.tsx` | AI 处理状态栏 | 133 |
| `src/components/NavigationBar.tsx` | 导航栏 | 89 |
| `src/components/GlassButton.tsx` | 玻璃态按钮 | 69 |
| `src/components/InlineVoicePanel.tsx` | 行内语音面板 | 167 |
| `src/components/AuthGuard.tsx` | 认证守卫 | 75 |
| `src/hooks/useAuth.ts` | 认证 Hook | 157 |
| `src/hooks/useAutoSave.ts` | 自动保存 Hook | 106 |
| `src/hooks/useRecorder.ts` | 录音 Hook | 297 |
| `src/lib/prisma.ts` | Prisma 客户端 | 25 |
| `src/lib/supabase/client.ts` | 浏览器端 Supabase | 16 |
| `src/lib/supabase/server.ts` | 服务端 Supabase | 36 |
| `src/lib/supabase/middleware.ts` | 中间件辅助 | 56 |
| `src/services/noteService.ts` | 数据库服务层 | 254 |
| `src/middleware.ts` | Next.js 中间件 | 40 |

---

## 🚀 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase 和 Gemini 配置

# 3. 初始化数据库
npx prisma migrate dev --name init
npx prisma generate

# 4. 启动开发服务器
npm run dev
```

---

**导出完成！** 🎉




