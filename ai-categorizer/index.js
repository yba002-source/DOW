import http from "http";
import { pipeline } from "@xenova/transformers";

/**
 * DOW AI Categorizer — Embeddings + Similarity (Option 2)
 *
 * - Uses sentence embeddings (no training)
 * - Matches article text against category descriptions
 * - Deterministic, explainable, scalable
 */

// ----------------------
// Config
// ----------------------
const PORT = process.env.PORT || 3000;

// Keep categories stable (must match backend ids)
const CATEGORIES = [
  "politics",
  "geopolitics",
  "elections",
  "government",
  "law",
  "crime",
  "terrorism",
  "conflict",
  "defense",
  "protest",
  "economy",
  "markets",
  "business",
  "energy",
  "finance",
  "technology",
  "cybersecurity",
  "science",
  "space",
  "health",
  "weather",
  "climate",
  "environment",
  "disaster",
  "accident",
  "transportation",
  "aviation",
  "maritime",
  "rail",
  "education",
  "sports",
  "entertainment",
  "culture",
  "fashion",
  "travel",
  "real_estate",
  "labor",
  "food"
];

// Short semantic descriptions for each category
const CATEGORY_DESCRIPTIONS = {
  politics: "political leadership, policy, government decisions",
  geopolitics: "relations between countries, diplomacy, international tensions",
  elections: "voting, campaigns, ballots, election results",
  government: "public services, ministries, regulations",
  law: "courts, judges, legal rulings, lawsuits",
  crime: "criminal activity, arrests, police investigations",
  terrorism: "terror attacks, extremist violence, bombings",
  conflict: "wars, armed conflict, fighting between groups",
  defense: "military forces, weapons, national defense",
  protest: "demonstrations, protests, civil unrest",
  economy: "economic growth, inflation, jobs, recession",
  markets: "stock markets, indices, trading activity",
  business: "companies, earnings, mergers, corporate news",
  energy: "oil, gas, renewables, energy supply",
  finance: "banks, interest rates, monetary policy",
  technology: "software, hardware, digital technology",
  cybersecurity: "hacking, cyber attacks, data breaches",
  science: "scientific research, studies, discoveries",
  space: "space missions, rockets, satellites",
  health: "healthcare, diseases, hospitals, medicine",
  weather: "storms, temperature, weather forecasts",
  climate: "climate change, emissions, global warming",
  environment: "environmental protection, pollution, wildlife",
  disaster: "natural disasters like earthquakes or floods",
  accident: "accidents, crashes, unintended incidents",
  transportation: "roads, traffic, vehicles, transport systems",
  aviation: "airlines, aircraft, airports, flights",
  maritime: "ships, ports, sea transport",
  rail: "trains, railways, metro systems",
  education: "schools, universities, education policy",
  sports: "sports events, matches, competitions",
  entertainment: "movies, music, celebrities",
  culture: "arts, heritage, cultural events",
  fashion: "fashion industry, designers, trends",
  travel: "tourism, travel destinations, hotels",
  real_estate: "housing, property, real estate market",
  labor: "workers, employment, strikes",
  food: "food safety, restaurants, agriculture"
};

// ----------------------
// Embedding model (lazy-loaded)
// ----------------------
let embedder = null;
async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return embedder;
}

// Cosine similarity
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ----------------------
// HTTP server
// ----------------------
const server = http.createServer(async (req, res) => {
  // Health
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // Categorize
  if (req.method === "POST" && req.url === "/categorize") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const text = `${payload.title || ""} ${payload.text || ""} ${payload.dow_text || ""}`.trim();

        if (!text) {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ categories: ["general"] }));
        }

        const model = await getEmbedder();

        // Embed article
        const articleEmbedding = await model(text, {
          pooling: "mean",
          normalize: true
        });

        const scores = [];

        for (const cat of CATEGORIES) {
          const desc = CATEGORY_DESCRIPTIONS[cat];
          const catEmbedding = await model(desc, {
            pooling: "mean",
            normalize: true
          });

          const score = cosineSimilarity(
            articleEmbedding.data[0],
            catEmbedding.data[0]
          );

          scores.push({ cat, score });
        }

        // Sort by similarity
        scores.sort((a, b) => b.score - a.score);

        // Pick top categories
        const picked = scores
          .filter((s) => s.score > 0.25)
          .slice(0, 5)
          .map((s) => s.cat);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            categories: picked.length ? picked : ["general"]
          })
        );
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ categories: ["general"], error: "bad_request" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`AI Categorizer listening on port ${PORT}`);
});
