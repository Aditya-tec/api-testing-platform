// src/utils/ssrfProtection.js
// Prevents Server-Side Request Forgery (SSRF) attacks.
//
// SSRF = attacker tricks your server into making requests to internal infrastructure.
// Example attack: POST /jobs with url: "http://169.254.169.254/latest/meta-data/"
// That's the AWS EC2 metadata endpoint — returns cloud credentials.
//
// We block:
//   1. Private IP ranges (RFC 1918): 10.x, 172.16-31.x, 192.168.x
//   2. Loopback: 127.x, ::1
//   3. Link-local: 169.254.x.x (cloud metadata)
//   4. IPv6 private ranges
//   5. Non-HTTP(S) protocols
//   6. Hostnames that resolve to blocked IPs (DNS rebinding protection)
//
// We do a pre-flight DNS resolve before axios fires the request.

const dns = require("dns").promises;
const { isIP } = require("is-ip");
const { URL } = require("url");
const logger = require("./logger");

// ─── Blocked IP ranges ────────────────────────────────────────────────────────

const BLOCKED_CIDRS = [
  // IPv4 private ranges
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,

  // Loopback
  /^127\./,

  // Link-local / cloud metadata
  /^169\.254\./,

  // Other reserved
  /^0\./,
  /^100\.64\./,   // Carrier-grade NAT
  /^198\.18\./,   // Benchmarking
  /^198\.51\.100\./, // TEST-NET-2
  /^203\.0\.113\./, // TEST-NET-3
  /^240\./,       // Reserved
  /^255\.255\.255\.255/,
];

const BLOCKED_IPV6 = [
  /^::1$/,          // loopback
  /^fc/i,           // unique local
  /^fd/i,           // unique local
  /^fe80/i,         // link-local
  /^::$/,           // unspecified
];

const isBlockedIP = (ip) => {
  if (!ip) return true; // block if we can't determine IP

  // Check IPv4 patterns
  for (const pattern of BLOCKED_CIDRS) {
    if (pattern.test(ip)) return true;
  }

  // Check IPv6 patterns
  for (const pattern of BLOCKED_IPV6) {
    if (pattern.test(ip)) return true;
  }

  return false;
};

// ─── Main validation function ─────────────────────────────────────────────────

/**
 * Validates a URL for SSRF safety.
 * Throws an error with a descriptive message if the URL is unsafe.
 * Should be called before any outgoing HTTP request is made.
 *
 * @param {string} rawUrl - the URL to validate
 * @throws {Error} if the URL is blocked
 */
const validateUrl = async (rawUrl) => {
  let parsed;

  // ── 1. Parse and validate URL structure ──────────────────────────────────
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL format: ${rawUrl}`);
  }

  // ── 2. Only allow HTTP and HTTPS ──────────────────────────────────────────
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Protocol not allowed: ${parsed.protocol}. Only http and https are permitted.`);
  }

  const hostname = parsed.hostname;

  // ── 3. Block if hostname is directly an IP address ────────────────────────
  if (isIP(hostname)) {
    if (isBlockedIP(hostname)) {
      logger.warn("[ssrf] Blocked direct IP access", { hostname });
      throw new Error(`Requests to internal/private IP addresses are not allowed: ${hostname}`);
    }
    return; // public IP — safe
  }

  // ── 4. Block known internal hostnames ─────────────────────────────────────
  const blockedHostnames = [
    "localhost",
    "metadata.google.internal",        // GCP metadata
    "169.254.169.254",                  // AWS/Azure metadata (IP form)
  ];

  if (blockedHostnames.includes(hostname.toLowerCase())) {
    throw new Error(`Hostname is not allowed: ${hostname}`);
  }

  // ── 5. DNS resolution check (prevents DNS rebinding attacks) ──────────────
  // Attacker registers "evil.com" → resolves to 127.0.0.1.
  // We resolve the hostname BEFORE axios does and check the IP.
  try {
    const { address } = await dns.lookup(hostname);

    if (isBlockedIP(address)) {
      logger.warn("[ssrf] Blocked DNS-resolved IP", { hostname, resolvedIp: address });
      throw new Error(
        `Hostname "${hostname}" resolves to a private/internal IP (${address}) and is not allowed.`
      );
    }
  } catch (err) {
    // If the error is our own SSRF block, re-throw it
    if (err.message.includes("resolves to a private")) throw err;

    // DNS lookup failed (domain doesn't exist) — let axios handle it naturally
    // We don't block here because it will just fail at request time anyway
    logger.debug("[ssrf] DNS lookup failed (domain may not exist)", { hostname, error: err.message });
  }
};

module.exports = { validateUrl, isBlockedIP };