import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.news.list.path, async (req, res) => {
    const newsList = await storage.getNewsList();
    res.json(newsList);
  });

  app.get(api.news.get.path, async (req, res) => {
    const item = await storage.getNews(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ message: 'News item not found' });
    }
    res.json(item);
  });

  app.post(api.news.create.path, async (req, res) => {
    try {
      const input = api.news.create.input.parse(req.body);
      const item = await storage.createNews(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Seed data if empty
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getNewsList();
  if (existing.length === 0) {
    console.log("Seeding database with sample news...");
    const samples = [
      {
        title: "Sample News in Chicago",
        content: "Reports of high activity in the downtown area.",
        lat: 41.8781,
        lng: -87.6298,
        corroborations: 100
      },
      {
        title: "Tech Summit in San Francisco",
        content: "Annual tech gathering attracts thousands.",
        lat: 37.7749,
        lng: -122.4194,
        corroborations: 45
      },
      {
        title: "Policy Change in Washington DC",
        content: "New legislation discussed in the capital.",
        lat: 38.9072,
        lng: -77.0369,
        corroborations: 80
      },
      {
        title: "Market Update from New York",
        content: "Stock exchange sees volatile trading day.",
        lat: 40.7128,
        lng: -74.0060,
        corroborations: 120
      },
      {
        title: "London Cultural Festival",
        content: "City-wide celebration of arts and culture.",
        lat: 51.5074,
        lng: -0.1278,
        corroborations: 60
      }
    ];

    for (const sample of samples) {
      await storage.createNews(sample);
    }
  }
}
