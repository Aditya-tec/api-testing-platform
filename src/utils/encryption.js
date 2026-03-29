// src/utils/encryption.js
// AES-256 encryption for credentials stored in MongoDB.
//
// WHY: Auth tokens and API keys stored in plaintext are a major security risk.
// If someone dumps the DB, they get every credential in clear text.
// Encrypting them means the attacker also needs the ENCRYPTION_SECRET to use them.
//
// HOW: AES (Advanced Encryption Standard) with a 256-bit key.
// crypto-js handles the key derivation and IV management internally.
//
// LIMITATIONS (intentional for this project):
//   - Single key for all credentials (a real system would use per-user keys or a KMS)
//   - Key is stored in env var (a real system would use AWS KMS, Vault, etc.)
//   - This is still far better than plaintext, and shows the right instinct.

const CryptoJS = require("crypto-js");
const env = require("../config/env");

const SECRET = env.ENCRYPTION_SECRET;

/**
 * Encrypts a plaintext string.
 * Returns a ciphertext string safe to store in MongoDB.
 *
 * @param {string} plaintext
 * @returns {string} encrypted ciphertext
 */
const encrypt = (plaintext) => {
  if (!plaintext) return plaintext;
  return CryptoJS.AES.encrypt(plaintext, SECRET).toString();
};

/**
 * Decrypts a ciphertext string produced by encrypt().
 * Returns the original plaintext.
 *
 * @param {string} ciphertext
 * @returns {string} decrypted plaintext
 */
const decrypt = (ciphertext) => {
  if (!ciphertext) return ciphertext;
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = { encrypt, decrypt };