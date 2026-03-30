// tests/validation.test.js
// Verifies input validation middleware rejects bad requests
// before they reach the database or execution engine.

const request = require("supertest");
const app = require("../src/app");

describe("Input Validation — POST /api/v1/collections", () => {
  test("rejects TRACE method", async () => {
    const res = await request(app)
      .post("/api/v1/collections")
      .send({
        name: "Test",
        requests: [{ index: 0, name: "x", method: "TRACE", url: "https://httpbin.org/get" }],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details[0]).toMatch(/TRACE/);
  });

  test("rejects URL without protocol", async () => {
    const res = await request(app)
      .post("/api/v1/collections")
      .send({
        name: "Test",
        requests: [{ index: 0, name: "x", method: "GET", url: "httpbin.org/get" }],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details[0]).toMatch(/not a valid URL/);
  });

  test("rejects empty requests array", async () => {
    const res = await request(app)
      .post("/api/v1/collections")
      .send({ name: "Test", requests: [] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("rejects missing collection name", async () => {
    const res = await request(app)
      .post("/api/v1/collections")
      .send({
        requests: [{ index: 0, name: "x", method: "GET", url: "https://httpbin.org/get" }],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("rejects duplicate request indexes", async () => {
    const res = await request(app)
      .post("/api/v1/collections")
      .send({
        name: "Test",
        requests: [
          { index: 0, name: "a", method: "GET", url: "https://httpbin.org/get" },
          { index: 0, name: "b", method: "GET", url: "https://httpbin.org/get" },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("Input Validation — POST /api/v1/jobs", () => {
  test("rejects missing collectionId", async () => {
    const res = await request(app)
      .post("/api/v1/jobs")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("rejects malformed collectionId", async () => {
    const res = await request(app)
      .post("/api/v1/jobs")
      .send({ collectionId: "not-a-valid-id" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});