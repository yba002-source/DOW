import http from "http";

const PORT = process.env.PORT || 3000;

function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  // Health check
  if (req.method === "GET" && req.url === "/health") {
    return sendJson(res, 200, { status: "ok" });
  }

  // Categorize (placeholder: always returns ["general"])
  if (req.method === "POST" && req.url === "/categorize") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const title = String(payload.title || "");
        const text = String(payload.text || "");
        const dow_text = String(payload.dow_text || "");

        // Placeholder response (AI comes later)
        return sendJson(res, 200, {
          categories: ["general"],
          debug: {
            received: {
              title_len: title.length,
              text_len: text.length,
              dow_text_len: dow_text.length
            }
          }
        });
      } catch (e) {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }
    });
    return;
  }

  // Not found
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`AI Categorizer listening on port ${PORT}`);
});
