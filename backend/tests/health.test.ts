import request, { type Response } from "supertest";
import { describe, expect, it } from "vitest";

import { buildTestApp } from "./helpers/test-app";

type ErrorBody = {
  error: { code: string; message: string; request_id?: string };
};

function errorBody(response: Response): ErrorBody {
  return response.body as ErrorBody;
}

describe("health endpoints", () => {
  it("answers /healthz without touching the database", async () => {
    const app = buildTestApp(() =>
      Promise.reject(new Error("database must not be called for liveness")),
    );

    const response = await request(app).get("/healthz");
    const body = response.body as { status: string; uptime_seconds: number };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.uptime_seconds).toBe("number");
  });

  it("answers /readyz 200 when the database is reachable", async () => {
    const app = buildTestApp(() => Promise.resolve());

    const response = await request(app).get("/readyz");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready", checks: { database: "ok" } });
  });

  it("answers /readyz 503 with the error shape when the database is down", async () => {
    const app = buildTestApp(() => Promise.reject(new Error("connection refused")));

    const response = await request(app).get("/readyz");
    const body = errorBody(response);

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("database_unavailable");
    expect(body.error.message).toBe("Database is not reachable.");
    expect(typeof body.error.request_id).toBe("string");
  });

  it("returns the error shape with a request id for unknown routes", async () => {
    const app = buildTestApp();

    const response = await request(app).get("/does-not-exist");
    const body = errorBody(response);

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("route_not_found");
    expect(response.headers["x-request-id"]).toBe(body.error.request_id);
  });

  it("echoes a caller-provided request id", async () => {
    const app = buildTestApp();

    const response = await request(app).get("/healthz").set("x-request-id", "test-request-1");

    expect(response.headers["x-request-id"]).toBe("test-request-1");
  });

  it("allows the configured CORS origin and rejects others", async () => {
    const app = buildTestApp();

    const allowed = await request(app).get("/healthz").set("Origin", "http://localhost:5173");
    const blocked = await request(app).get("/healthz").set("Origin", "https://evil.example");

    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
