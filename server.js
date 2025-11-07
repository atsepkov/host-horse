import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

mkdirSync("data", { recursive: true });
const db = new Database("data/emails.sqlite");
db.run(
  "CREATE TABLE IF NOT EXISTS emails (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, created_at TEXT)"
);

const insertStmt = db.prepare(
  "INSERT INTO emails (email, created_at) VALUES (?, datetime('now'))"
);

const port = parseInt(process.env.PORT || "3499", 10);

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/api/subscribe") {
      try {
        const { email } = await req.json();
        const normalized = String(email || "").trim().toLowerCase();
        if (!normalized) {
          return new Response(
            JSON.stringify({ error: "invalid email" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        try {
          insertStmt.run(normalized);
          return new Response(
            JSON.stringify({ status: "ok" }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          if (String(err).includes("UNIQUE")) {
            return new Response(
              JSON.stringify({ status: "duplicate" }),
              { headers: { "Content-Type": "application/json" } }
            );
          }
          return new Response(
            JSON.stringify({ error: "db error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "invalid request" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    try {
      return new Response(Bun.file(`.${filePath}`));
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
});

console.log(`Server running at http://localhost:${port}`);
