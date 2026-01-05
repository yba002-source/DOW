import http from "http";
import { pipeline } from "@xenova/transformers";

/**
 * DOW AI Categorizer — Embeddings + Similarity (Fixed)
 *
 * What was wrong before:
 * - We incorrectly used embedding.data[0] as if it were a vector.
 * - In practice, embedding.data is already the full Float32Array vector.
 *
 * Improvements:
 * - Correct vector handling
 * - Cache category embeddings (fast + scalable)
 * - Deterministic top-k selection
 */

// ----------------------
// Config
// ----------------------
const PORT = process.env.PORT || 3000;

// Must match backend stable ids
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
  "food",
];

// Short semantic descriptions
const CATEGORY_DESCRIPTIONS = {
  politics: "political leadership, policy, government decisions, parliament, president, prime minister",
  geopolitics: "relations between countries, diplomacy, international tensions, sanctions, border disputes",
  elections: "voting, campaigns, ballots, election results, candidates, polls",
  government: "public services, ministries, regulations, permits, visas, residency programs",
  law: "courts, judges, legal rulings, lawsuits, trials, sentences, appeals",
  crime: "criminal activity, arrests, police investigations, robbery, fraud, murder",
  terrorism: "terror attacks, extremist violence, bombings, ISIS, al-Qaeda, hostages",
  conflict: "wars, armed conflict, fighting, invasion, airstrikes, ceasefire",
  defense: "military forces, weapons, drones, defense ministry, bases, procurement",
  protest: "demonstrations, protests, riots, civil unrest, clashes, curfews",
  economy: "economic growth, inflation, GDP, unemployment, recession, cost of living",
  markets: "stock markets, indices, bonds, futures, market rally, selloff, trading",
  business: "companies, earnings, revenue, mergers, acquisitions, layoffs, CEO announcements",
  energy: "oil, gas, OPEC, pipelines, refineries, renewables, solar, wind, energy supply",
  finance: "banks, loans, interest rates, central bank decisions, monetary policy, credit",
  technology: "software, hardware, AI, semiconductors, chips, cloud services, internet platforms",
  cybersecurity: "hacking, cyber attacks, data breaches, malware, ransomware, phishing",
  science: "scientific research, studies, discoveries, laboratories, clinical trials",
  space: "space missions, rockets, satellites, launches, orbit, lunar, Mars",
  health: "healthcare, hospitals, disease outbreaks, vaccines, medical emergencies",
  weather: "storms, rainfall, snow, heatwaves, temperature, forecasts, weather warnings",
  climate: "climate change, emissions, carbon, net zero targets, global warming",
  environment: "pollution, conservation, wildlife, forests, environmental damage, plastics",
  disaster: "natural disasters like earthquakes, floods, hurricanes, wildfires, tsunamis, rescue operations",
  accident: "accidents, crashes, collisions, derailments, injuries, fatalities, incidents",
  transportation: "roads, highways, traffic, bridges, tunnels, buses, trucks, commuting disruptions",
  aviation: "airlines, aircraft, flights, airports, runway incidents, airspace restrictions",
  maritime: "ships, ports, tankers, ferries, coast guard, maritime incidents at sea",
  rail: "trains, railways, metro systems, subways, stations, rail disruptions",
  education: "schools, universities, students, teachers, exams, education policy",
  sports: "sports matches, tournaments, leagues, championships, FIFA, Olympics",
  entertainment: "movies, music, concerts, celebrities, box office, actors",
  culture: "museums, art, festivals, heritage, exhibitions, cultural events",
  fashion: "fashion industry, designers, runway shows, couture, fashion week",
  travel: "tourism, travel destinations, hotels, travel advisories, visas for travel",
  real_estate: "housing, property, rent, mortgages, real estate market, developers",
  labor: "workers, unions, strikes, wages, labor disputes, workforce issues",
  food: "food safety, contamination, recalls, restaurants, agriculture, supply issues",
};

// Similarity tuning
const TOP_K = 5;
// Lower = more categories, Higher = stricter. Start modest.
const MIN_SCORE = 0.22;

// ----------------------
// Lazy load model + cache category vectors
// ----------------------
let embedder = null;
let categoryVectors = null; // Map<string, Float32Array>

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

async function embedText(text) {
  const model = await getEmbedder();
  const out = await model(text, { pooling: "mean", normalize: true });
  // out.data is the full embedding vector (Float32Array)
  return out.data;
}

async function ensureCategoryVectors() {
  if (categoryVectors) return categoryVectors;

  const map = new Map();
  // Compute once, reuse forever
  for (const cat of CATEGORIES) {
    const desc = CATEGORY_DESCRIPTIONS[cat] || cat;
    const vec = await embedText(desc);
    map.set(cat, vec);
  }
  categoryVectors = map;
  return categoryVectors;
}

// Cosine similarity for normalized vectors
function cosineSimilarity(a, b) {
  let dot = 0;
  // If normalize:true worked, dot is enough; still safe to compute dot directly.
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  return dot;
}

// ----------------------
// Utilities
// ----------------------
function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

// ----------------------
// HTTP server
// ----------------------
const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, { status: "ok" });
  }

  if (req.method === "POST" && req.url === "/categorize") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const title = String(payload.title || "");
        const text = String(payload.text || "");
        const dow_text = String(payload.dow_text || "");
        const wantDebug = Boolean(payload.debug);

        const combined = `${title}\n${dow_text}\n${text}`.trim();
        if (!combined) return sendJson(res, 200, { categories: ["general"] });

        // Ensure vectors are ready
        const vecMap = await ensureCategoryVectors();

        // Embed article once
        const articleVec = await embedText(combined);

        // Score each category
        const scores = [];
        for (const cat of CATEGORIES) {
          const catVec = vecMap.get(cat);
          const score = cosineSimilarity(articleVec, catVec);
          scores.push({ cat, score });
        }

        // Sort, pick top
        scores.sort((a, b) => b.score - a.score);

        const picked = scores
          .filter((s) => s.score >= MIN_SCORE)
          .slice(0, TOP_K)
          .map((s) => s.cat);

        if (!picked.length) {
          return sendJson(res, 200, wantDebug ? { categories: ["general"], debug: { top: scores.slice(0, 8) } } : { categories: ["general"] });
        }

        return sendJson(
          res,
          200,
          wantDebug
            ? { categories: picked, debug: { top: scores.slice(0, 8) } }
            : { categories: picked },
        );
      } catch {
        return sendJson(res, 400, { categories: ["general"], error: "bad_request" });
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
