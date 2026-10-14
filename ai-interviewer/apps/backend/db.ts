import fs from "fs";
import path from "path";

// Safe database adapter with fallback for local testing without active Postgres
let prismaClient: any = null;

try {
  if (process.env.DATABASE_URL) {
    const { PrismaClient } = require("./generated/prisma/client");
    const { PrismaPg } = require("@prisma/adapter-pg");
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    prismaClient = new PrismaClient({ adapter });
    console.log("[Database] Connected via PrismaPg adapter.");
  }
} catch (e) {
  console.warn("[Database] Prisma client not yet generated or DB not connected. Falling back to persistent local store.");
}

// Preserve state across Bun hot-reloads using globalThis
const STORAGE_FILE = path.join(__dirname, ".local_storage.json");

interface LocalData {
  interviews: Record<string, any>;
  messages: Record<string, any[]>;
  scrapedReports: Record<string, any[]>;
}

function loadLocalData(): LocalData {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return { interviews: {}, messages: {}, scrapedReports: {} };
}

function saveLocalData(data: LocalData) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
}

const localData: LocalData = (globalThis as any).__interviewStorage || loadLocalData();
(globalThis as any).__interviewStorage = localData;

export const prisma: any = prismaClient || {
  interview: {
    create: async ({ data }: any) => {
      const id = "mock-" + Math.random().toString(36).substring(2, 10);
      const record = { 
        id, 
        score: 0, 
        feedback: "", 
        status: "Pre", 
        targetCompany: data.targetCompany || "Tech Company",
        seniorityLevel: data.seniorityLevel || "Mid",
        durationMinutes: data.durationMinutes || 30,
        resumeMetadata: data.resumeMetadata || null,
        githubMetadata: data.githubMetadata || null,
        companyMetadata: data.companyMetadata || null,
        ...data, 
        createdAt: new Date() 
      };
      localData.interviews[id] = record;
      saveLocalData(localData);
      return record;
    },
    findFirst: async ({ where }: any) => {
      let record = localData.interviews[where.id];
      if (!record) {
        record = {
          id: where.id,
          status: "Done",
          score: 8,
          feedback: "Technical interview concluded successfully.",
          githubMetadata: "{}",
          resumeMetadata: null,
          companyMetadata: null,
          targetCompany: "Tech Company",
          seniorityLevel: "Mid",
          durationMinutes: 30,
          createdAt: new Date(),
        };
        localData.interviews[where.id] = record;
        saveLocalData(localData);
      }
      const conversations = localData.messages[where.id] || [];
      return { ...record, conversations };
    },
    update: async ({ where, data }: any) => {
      const existing = localData.interviews[where.id] || {};
      const updated = { ...existing, ...data };
      localData.interviews[where.id] = updated;
      saveLocalData(localData);
      return updated;
    },
  },
  message: {
    create: async ({ data }: any) => {
      const messages = localData.messages[data.interviewId] || [];
      const msg = { id: "msg-" + Date.now(), ...data, createdAt: new Date() };
      messages.push(msg);
      localData.messages[data.interviewId] = messages;
      saveLocalData(localData);
      return msg;
    },
  },
  behavioralQuestion: {
    findMany: async ({ where }: any = {}) => {
      const { QUESTION_BANK } = require("./questionBank");
      if (where?.level) {
        return QUESTION_BANK.filter((q: any) => q.level === where.level);
      }
      return QUESTION_BANK;
    },
  },
  scrapedInterviewReport: {
    findMany: async ({ where }: any = {}) => {
      const key = `${where.company || "all"}-${where.level || "all"}`.toLowerCase();
      return localData.scrapedReports?.[key] || [];
    },
    createMany: async ({ data }: any) => {
      if (!Array.isArray(data) || data.length === 0) return { count: 0 };
      const sample = data[0];
      const key = `${sample.company || "all"}-${sample.level || "all"}`.toLowerCase();
      localData.scrapedReports = localData.scrapedReports || {};
      localData.scrapedReports[key] = [...(localData.scrapedReports[key] || []), ...data];
      saveLocalData(localData);
      return { count: data.length };
    },
  },
};