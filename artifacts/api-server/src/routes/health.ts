import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { store } from "./filetrail.js";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    // Health routes have no paginated data and no list limit is required.
    // JsonStore health reads from disk.
    // SQL-backed stores should run SELECT 1 here.
    await store.healthCheck();
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch {
    const data = HealthCheckResponse.parse({ status: "unhealthy" });
    res.status(503).json(data);
  }
});

export default router;
