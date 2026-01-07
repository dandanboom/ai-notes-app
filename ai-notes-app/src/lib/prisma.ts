/**
 * Prisma 客户端单例 (延迟加载)
 * 
 * 只有在实际需要数据库操作时才初始化 Prisma
 * 这样本地模式可以在没有数据库的情况下运行
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 检查数据库是否可用
function isDatabaseAvailable(): boolean {
  return !!(process.env.DATABASE_URL || process.env.DIRECT_URL);
}

// 延迟初始化 Prisma
function createPrismaClient(): PrismaClient | null {
  if (!isDatabaseAvailable()) {
    console.warn("⚠️ [Prisma] DATABASE_URL 未配置，数据库功能不可用");
    return null;
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  return client;
}

// 获取 Prisma 客户端（延迟初始化）
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const client = createPrismaClient();
    if (!client) {
      throw new Error("数据库未配置，请设置 DATABASE_URL 环境变量");
    }
    globalForPrisma.prisma = client;
  }
  return globalForPrisma.prisma;
}

// 检查数据库是否可用（供外部使用）
export function checkDatabaseAvailable(): boolean {
  return isDatabaseAvailable();
}

// 为了兼容旧代码，导出一个 proxy
// 注意：这只在真正访问 prisma 方法时才会初始化
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const client = getPrisma();
    return (client as unknown as Record<string, unknown>)[prop as string];
  },
});

export default prisma;




