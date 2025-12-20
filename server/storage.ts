import { db } from "./db";
import { news, type InsertNews, type News } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getNewsList(): Promise<News[]>;
  getNews(id: number): Promise<News | undefined>;
  createNews(item: InsertNews): Promise<News>;
}

export class DatabaseStorage implements IStorage {
  async getNewsList(): Promise<News[]> {
    return await db.select().from(news);
  }

  async getNews(id: number): Promise<News | undefined> {
    const [item] = await db.select().from(news).where(eq(news.id, id));
    return item;
  }

  async createNews(insertNews: InsertNews): Promise<News> {
    const [item] = await db.insert(news).values(insertNews).returning();
    return item;
  }
}

export const storage = new DatabaseStorage();
