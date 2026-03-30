// tests/encryption.test.js
// Verifies credentials are encrypted at rest and
// decrypted correctly at execution time.

const { encrypt, decrypt } = require("../src/utils/encryption");

describe("Credential Encryption", () => {
  test("encrypted value is not plaintext", () => {
    const token = "super-secret-token-abc123";
    const encrypted = encrypt(token);
    expect(encrypted).not.toBe(token);
    expect(encrypted).not.toContain(token);
  });

  test("decrypt reverses encrypt correctly", () => {
    const token = "super-secret-token-abc123";
    const encrypted = encrypt(token);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(token);
  });

  test("two encryptions of same value produce different ciphertext", () => {
    const token = "same-token";
    const first = encrypt(token);
    const second = encrypt(token);
    // AES with random IV means same input → different output each time
    expect(first).not.toBe(second);
    // But both decrypt to the same value
    expect(decrypt(first)).toBe(decrypt(second));
  });

  test("handles null/undefined gracefully", () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt(undefined)).toBeUndefined();
    expect(decrypt(null)).toBeNull();
    expect(decrypt(undefined)).toBeUndefined();
  });
});