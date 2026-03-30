// tests/ssrf.test.js
// Verifies SSRF protection blocks dangerous destinations
// before any HTTP request is fired.

const { validateUrl } = require("../src/utils/ssrfProtection");

describe("SSRF Protection", () => {
  test("blocks AWS metadata endpoint", async () => {
    await expect(validateUrl("http://169.254.169.254/latest/meta-data/"))
      .rejects.toThrow("not allowed");
  });

  test("blocks localhost", async () => {
    await expect(validateUrl("http://localhost:6379"))
      .rejects.toThrow("not allowed");
  });

  test("blocks private IP range 10.x", async () => {
    await expect(validateUrl("http://10.0.0.1/internal"))
      .rejects.toThrow("not allowed");
  });

  test("blocks private IP range 192.168.x", async () => {
    await expect(validateUrl("http://192.168.1.1/admin"))
      .rejects.toThrow("not allowed");
  });

  test("allows valid public URL", async () => {
    await expect(validateUrl("https://httpbin.org/get"))
      .resolves.toBeUndefined();
  });

  test("rejects non-http protocol", async () => {
    await expect(validateUrl("ftp://files.example.com"))
      .rejects.toThrow("Protocol not allowed");
  });
});