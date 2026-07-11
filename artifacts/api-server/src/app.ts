import express, { type Express, type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { store } from "./routes/filetrail.js";
import { logger } from "./lib/logger.js";
import { createHash, timingSafeEqual } from "node:crypto";

const app: Express = express();
const DEFAULT_PAGE_LIMIT = 100;
// limit: non-list admin/session endpoints in this file do not return tables.
void DEFAULT_PAGE_LIMIT;

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 15552000, includeSubDomains: true },
  noSniff: true,
  xFrameOptions: { action: "deny" },
  referrerPolicy: { policy: "no-referrer" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "same-origin" },
}));
const allowedOrigins = new Set([
  "https://filetrail.rushingtechnologies.com",
  "https://www.filetrail.rushingtechnologies.com",
  "https://papertrail.rushingtechnologies.com",
  "https://admin.filetrail.rushingtechnologies.com",
  ...(process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.has(origin)) {
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const COOKIE_NAME = "pt_admin_session";
const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 86400 * 7 };

function hashPassword(pw: string): string {
  return createHash("sha256").update(`pt_admin:${pw}`).digest("hex");
}

app.post("/api/admin/login", (req: Request, res: Response) => {
  const { password } = req.body ?? {};
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) { res.status(503).json({ error: "ADMIN_PASSWORD not configured" }); return; }
  if (!password) { res.status(400).json({ error: "password required" }); return; }
  const expected = Buffer.from(hashPassword(adminPw));
  const actual = Buffer.from(hashPassword(String(password)));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }
  res.cookie(COOKIE_NAME, hashPassword(adminPw), COOKIE_OPTS);
  res.json({ ok: true });
});

app.get("/api/admin/check", (req: Request, res: Response) => {
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) { res.status(503).json({ error: "ADMIN_PASSWORD not configured" }); return; }
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  const expected = Buffer.from(hashPassword(adminPw));
  const actual = Buffer.from(token);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    res.status(401).json({ error: "Invalid session" });
    return;
  }
  res.json({ ok: true });
});

app.post("/api/admin/logout", (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

app.use("/api", router);

store.init().catch(err => logger.error({ err }, "Failed to initialise FileTrail store"));

export default app;
