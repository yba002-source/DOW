// index.js
import http from "http";
import { pipeline } from "@xenova/transformers";

/**
 * DOW AI Categorizer — Embeddings + Similarity (Improved)
 *
 * Goal:
 * - Keep your embedding-based “AI understands text” approach (no keyword rules)
 * - Reduce “everything is general” by tuning thresholds AND strengthening category descriptions
 * - Max 2 labels for now
 *
 * Notes:
 * - This is still semantic similarity, not hard keyword categorization.
 * - The biggest win is making label descriptions more semantically representative (law/crime/accident/etc).
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

// ✅ Strengthened semantic descriptions (especially LAW / CRIME / ACCIDENT / DISASTER / WEATHER)
// These are not "keyword rules" — they are label meaning prompts for the embedder.
const CATEGORY_DESCRIPTIONS = {
  politics:
    "politics and political leadership, policy debates, parliament, ministers, president, prime minister, political parties, legislation proposals",
  geopolitics:
    "geopolitics and international relations, diplomacy, foreign policy, tensions between countries, sanctions, border disputes, embassies, regional conflicts",
  elections:
    "elections and voting, campaign rallies, ballots, election results, candidates, polls, referendums, electoral commission, turnout",
  government:
    "government administration, ministries, public services, regulations, permits, visas, residency, civil service decisions, public sector programs",
  law:
    "law and justice system, court case, judge, magistrate, trial, hearing, legal ruling, verdict, appeal, lawsuit, prosecution, defense lawyer, conviction, sentencing, suspended sentence, bail",
  crime:
    "crime and policing, police investigation, arrest, charged, suspect, offender, assault, attack, stabbing, shooting, robbery, burglary, fraud, kidnapping, violence, homicide, domestic violence, missing person",
  terrorism:
    "terrorism and extremist violence, terror attack, bombing, hostage, ISIS, al-Qaeda, militant extremist group, mass casualty attack",
  conflict:
    "armed conflict and war, fighting, invasion, airstrikes, frontline clashes, ceasefire talks, shelling, military offensive",
  defense:
    "defense and military, armed forces, weapons systems, drones, procurement, bases, training exercises, defense ministry announcements",
  protest:
    "protests and civil unrest, demonstrations, riots, clashes with police, strikes, curfews, rallies, unrest in streets",
  economy:
    "economy and macroeconomics, GDP, inflation, recession, unemployment, cost of living, economic crisis, currency collapse",
  markets:
    "financial markets, stock market, indices, bonds, futures, trading, market rally, selloff, volatility, investors",
  business:
    "business and companies, earnings, revenue, mergers and acquisitions, layoffs, corporate announcements, CEO changes, lawsuits involving companies",
  energy:
    "energy sector, oil, gas, OPEC, pipelines, refineries, fuel supply, renewables, solar, wind, energy prices",
  finance:
    "finance and banking, interest rates, central bank, monetary policy, loans, credit, banking sector stability, liquidity",
  technology:
    "technology and innovation, software, hardware, AI products, chips, cloud platforms, big tech, consumer electronics, internet services",
  cybersecurity:
    "cybersecurity incidents, hacking, cyber attack, data breach, ransomware, malware, phishing, security vulnerabilities, leaked data",
  science:
    "science and research, scientific study, discovery, laboratory work, peer reviewed research, experiments, clinical trials",
  space:
    "space exploration, rockets, satellite launch, orbit, lunar mission, Mars mission, space agencies, astronauts",
  health:
    "health and medicine, hospitals, illness, disease outbreak, vaccines, mental health, public health policy, medical emergency",
  weather:
    "weather and severe weather, storms, rainfall, flooding, heatwave, cyclone, hurricane, snow, temperature records, forecasts, weather warnings",
  climate:
    "climate change and emissions, carbon, net zero targets, global warming, climate policy, greenhouse gases, climate impacts",
  environment:
    "environment and nature, pollution, conservation, wildlife, forests, habitat loss, environmental damage, plastics, contamination",
  disaster:
    "disaster response and major emergencies, natural disaster, earthquake, wildfire, flood, hurricane, cyclone, tsunami, rescue operations, evacuations, disaster zone",
  accident:
    "accident and incidents, crash, collision, injuries, fatalities, incident investigation, workplace accident, drowning, industrial accident, traffic accident",
  transportation:
    "transportation systems and disruptions, roads, highways, traffic, bridges, tunnels, buses, trucking, commuting disruptions, road closures",
  aviation:
    "aviation industry and incidents, airlines, aircraft, flights, airports, runway incident, airspace restriction, flight delays, emergency landing",
  maritime:
    "maritime and shipping, ships, ports, tankers, ferries, coast guard, maritime accident, sinking, collision at sea",
  rail:
    "rail and metro systems, trains, railways, subway, station closures, derailment, rail disruptions, metro delays",
  education:
    "education sector, schools, universities, students, teachers, exams, education policy, school safety, academic results",
  sports:
    "sports events and competitions, matches, tournaments, leagues, championships, FIFA, Olympics, athletes",
  entertainment:
    "entertainment industry, movies, music, concerts, celebrities, box office, actors, streaming releases",
  culture:
    "culture and arts, museums, art exhibitions, festivals, heritage sites, cultural events, literature",
  fashion:
    "fashion industry, designers, runway shows, couture, fashion week, luxury brands",
  travel:
    "travel and tourism, destinations, hotels, travel advisories, visas for travel, airlines tourism demand",
  real_estate:
    "real estate and housing, property prices, rent, mortgages, developers, housing market, construction projects",
  labor:
    "labor and workforce, workers, unions, strikes, wage disputes, labor policy, workplace rights, employment issues",
  food:
    "food and consumer safety, food contamination, recalls, restaurants, food business, agriculture supply chain, food fraud",
};

// ----------------------
// Similarity + decision tuning
// ----------------------

// How many labels we can output
const MAX_LABELS = 2;

// Hard minimum: below this, do not pick (prevents nonsense tags)
const MIN_SCORE = 0.14;

// Soft gate for top score: if top is below this, return general
const SOFT_TOP_FLOOR = 0.14;

// Second label gate: only if it clears this AND is reasonably close to top
const SECOND_MIN_SCORE = 0.11;
const SECOND_RATIO = 0.70;

// For debug payload
const THRESHOLDS = {
  MIN_SCORE,
  SOFT_TOP_FLOOR,
  SECOND_MIN_SCORE,
  SECOND_RATIO,
  MAX_LABELS,
};

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
  return out.data;
}

async function ensureCategoryVectors() {
  if (categoryVectors) return categoryVectors;

  const map = new Map();
  for (const cat of CATEGORIES) {
    const desc = CATEGORY_DESCRIPTIONS[cat] || cat;
    const vec = await embedText(desc);
    map.set(cat, vec);
  }
  categoryVectors = map;
  return categoryVectors;
}

// Cosine similarity for normalized vectors (dot product)
function cosineSimilarity(a, b) {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  return dot;
}

function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

/**
 * Pick up to 2 labels using tuned thresholds.
 * Returns { categories, debugTop, reason }
 */
function pickCategories(scores) {
  // scores must be sorted desc
  const top = scores[0] || null;
  if (!top) return { categories: ["general"], reason: "no_scores" };

  // If even the best match is too weak, return general
  if (top.score < SOFT_TOP_FLOOR) {
    return { categories: ["general"], reason: "top_below_soft_floor" };
  }

  // Filter by minimum score
  const eligible = scores.filter((s) => s.score >= MIN_SCORE);

  if (!eligible.length) {
    return { categories: ["general"], reason: "none_above_min_score" };
  }

  // Always take the best eligible
  const picked = [eligible[0].cat];

  // Optionally take a second label if it meets second criteria
  if (MAX_LABELS >= 2) {
    const second = eligible.find((s) => s.cat !== picked[0]);
    if (second) {
      const closeEnough = second.score >= top.score * SECOND_RATIO;
      const strongEnough = second.score >= SECOND_MIN_SCORE;
      if (closeEnough && strongEnough) {
        picked.push(second.cat);
      }
    }
  }

  if (!picked.length) {
    return { categories: ["general"], reason: "picked_empty" };
  }

  return { categories: picked, reason: "picked_ok" };
}

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

        // Combine in a stable order
        const combined = `${title}\n\n${dow_text}\n\n${text}`.trim();
        if (!combined) {
          return sendJson(res, 200, wantDebug ? { categories: ["general"], debug: { top: [], thresholds: THRESHOLDS } } : { categories: ["general"] });
        }

        const vecMap = await ensureCategoryVectors();
        const articleVec = await embedText(combined);

        const scores = [];
        for (const cat of CATEGORIES) {
          const catVec = vecMap.get(cat);
          const score = cosineSimilarity(articleVec, catVec);
          scores.push({ cat, score });
        }

        scores.sort((a, b) => b.score - a.score);

        const { categories, reason } = pickCategories(scores);

        if (!wantDebug) {
          return sendJson(res, 200, { categories });
        }

        return sendJson(res, 200, {
          categories,
          debug: {
            reason,
            top: scores.slice(0, 10),
            thresholds: THRESHOLDS,
          },
        });
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
