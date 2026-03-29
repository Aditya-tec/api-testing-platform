// src/services/requestExecutor.js
// Responsible for executing a SINGLE HTTP request from a job's snapshot.
// Handles:
//   - header/body/URL construction (with auth injection)
//   - timeout enforcement
//   - exponential backoff retries
//   - capturing latency, status, response snippet, and errors
//
// Does NOT touch the DB — that's the jobExecutor's responsibility.
// Returns a structured result object the jobExecutor can persist.

const axios = require("axios");
const logger = require("../utils/logger");
const { validateUrl } = require("../utils/ssrfProtection");

const MAX_RESPONSE_BYTES = 2048; // 2KB response snippet limit

/**
 * Truncates a string to MAX_RESPONSE_BYTES characters.
 * Prevents bloated DB documents from large API responses.
 */
const truncateResponse = (text) => {
  if (!text) return null;
  const str = typeof text === "object" ? JSON.stringify(text) : String(text);
  return str.length > MAX_RESPONSE_BYTES ? str.slice(0, MAX_RESPONSE_BYTES) + "…[truncated]" : str;
};

/**
 * Resolves a dot-path string against an object.
 * Used for variable extraction: "data.user.id" → obj.data.user.id
 *
 * @param {Object} obj - the parsed response body
 * @param {string} path - dot-notation path
 * @returns {*} resolved value, or undefined if path doesn't exist
 */
const resolvePath = (obj, path) => {
  return path.split(".").reduce((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[key];
  }, obj);
};

/**
 * Replaces all {{variable}} placeholders in a string with values from the variables map.
 *
 * @param {string} str - string potentially containing {{placeholders}}
 * @param {Map|Object} variables - current variable store
 * @returns {string} resolved string
 */
const injectVariables = (str, variables) => {
  if (!str || typeof str !== "string") return str;
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables instanceof Map ? variables.get(key) : variables[key];
    return value !== undefined ? value : match; // leave unreplaced if not found
  });
};

/**
 * Recursively inject variables into all string values of an object or array.
 * Used for headers and body injection.
 */
const injectVariablesDeep = (obj, variables) => {
  if (typeof obj === "string") return injectVariables(obj, variables);
  if (Array.isArray(obj)) return obj.map((item) => injectVariablesDeep(item, variables));
  if (obj && typeof obj === "object") {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = injectVariablesDeep(val, variables);
    }
    return result;
  }
  return obj;
};

/**
 * Extracts variables from a response body based on the request's extract rules.
 *
 * @param {Object} responseData - parsed JSON response body
 * @param {Array} extractRules - [{ variable, from }] from requestSnapshot
 * @param {Map} variables - mutable variable store to populate
 * @returns {Array} list of { variable, value } for logging
 */
const extractVariables = (responseData, extractRules, variables) => {
  const extracted = [];

  for (const rule of extractRules) {
    const value = resolvePath(responseData, rule.from);

    if (value !== undefined) {
      variables.set(rule.variable, value);
      extracted.push({ variable: rule.variable, value });
      logger.debug("[executor] Variable extracted", { variable: rule.variable, value });
    } else {
      logger.warn("[executor] Variable extraction failed — path not found", {
        variable: rule.variable,
        path: rule.from,
      });
    }
  }

  return extracted;
};

/**
 * Sleep utility for retry backoff.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute a single HTTP request with retries.
 *
 * @param {Object} requestDef - one entry from job.requestsSnapshot
 * @param {Object} authSnapshot - job.authSnapshot
 * @param {Map} variables - current variable store (mutated in place on extraction)
 * @param {number} maxAttempts - total attempts including first try (default: 3)
 * @param {Function} onRetry - optional callback(attempt, reason) fired before each retry
 * @returns {Object} result - structured outcome for persisting to RequestResult
 */
const executeRequest = async (requestDef, authSnapshot, variables, maxAttempts = 3, onRetry = null) => {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt++;
    const isRetry = attempt > 1;

    if (isRetry) {
      const backoffMs = 1000 * Math.pow(2, attempt - 2); // 1s, 2s, 4s
      logger.info("[executor] Retrying request", {
        name: requestDef.name,
        attempt,
        backoffMs,
      });
      // Fire callback so jobExecutor can write a REQUEST_RETRYING log entry
      if (onRetry) {
        await onRetry(attempt, lastError?.message || "previous attempt failed");
      }
      await sleep(backoffMs);
    }

    const startedAt = new Date();

    try {
      // ── Build request config ──────────────────────────────────────────────

      // Inject variables into URL
      const resolvedUrl = injectVariables(requestDef.url, variables);

      // Build headers: start with request-level headers, inject variables
      const headers = injectVariablesDeep(
        Object.fromEntries(
          requestDef.headers instanceof Map
            ? requestDef.headers
            : Object.entries(requestDef.headers || {})
        ),
        variables
      );

      // Inject auth headers
      if (authSnapshot?.type === "bearer" && authSnapshot.token) {
        headers["Authorization"] = `Bearer ${authSnapshot.token}`;
      } else if (authSnapshot?.type === "apiKey" && authSnapshot.token && authSnapshot.headerName) {
        headers[authSnapshot.headerName] = authSnapshot.token;
      }

      // Inject variables into body
      const resolvedBody = injectVariablesDeep(requestDef.body, variables);

      // ── SSRF check — runs before every attempt (including retries) ───────
      // Validates the resolved URL (with variables injected) not the raw template
      try {
        await validateUrl(resolvedUrl);
      } catch (ssrfErr) {
        // SSRF violations are non-retryable — fail immediately, no retries
        return {
          status: "FAILED",
          httpStatus: null,
          latencyMs: null,
          responseSnippet: null,
          errorMessage: `SSRF_BLOCKED: ${ssrfErr.message}`,
          retryCount: 0,
          startedAt,
          completedAt: new Date(),
          extractedVars: [],
        };
      }

      // ── Fire the request ─────────────────────────────────────────────────
      const response = await axios({
        method: requestDef.method,
        url: resolvedUrl,
        headers,
        data: resolvedBody,
        timeout: requestDef.timeoutMs || 10000,
        validateStatus: () => true, // don't throw on 4xx/5xx — we handle those ourselves
      });

      const completedAt = new Date();
      const latencyMs = completedAt - startedAt;

      // ── Extract variables from response ──────────────────────────────────
      let extractedVars = [];
      if (requestDef.extract?.length > 0) {
        try {
          extractedVars = extractVariables(response.data, requestDef.extract, variables);
        } catch (extractErr) {
          logger.warn("[executor] Variable extraction threw an error", {
            error: extractErr.message,
          });
        }
      }

      return {
        status: "COMPLETED",
        httpStatus: response.status,
        latencyMs,
        responseSnippet: truncateResponse(response.data),
        errorMessage: null,
        retryCount: attempt - 1,
        startedAt,
        completedAt,
        extractedVars,
      };
    } catch (err) {
      const completedAt = new Date();
      lastError = err;

      logger.warn("[executor] Request attempt failed", {
        name: requestDef.name,
        attempt,
        error: err.message,
      });

      // ── Non-retryable error classification ──────────────────────────────
      // These errors will not improve on retry — fail fast
      const nonRetryable =
        err.message?.includes("SSRF_BLOCKED") ||
        err.code === "ECONNREFUSED" ||      // port closed — won't change
        err.code === "ERR_INVALID_URL" ||   // malformed URL
        err.response?.status === 401 ||     // auth failure — retrying won't help
        err.response?.status === 403 ||     // forbidden — retrying won't help
        err.response?.status === 404;       // not found — retrying won't help

      if (nonRetryable) {
        return {
          status: "FAILED",
          httpStatus: err.response?.status || null,
          latencyMs: null,
          responseSnippet: null,
          errorMessage: err.message,
          retryCount: attempt - 1,
          startedAt,
          completedAt: new Date(),
          extractedVars: [],
        };
      }
    }
  }

  // All attempts exhausted
  return {
    status: "FAILED",
    httpStatus: null,
    latencyMs: null,
    responseSnippet: null,
    errorMessage: lastError?.message || "Unknown error after all retries",
    retryCount: attempt - 1,
    startedAt: new Date(),
    completedAt: new Date(),
    extractedVars: [],
  };
};

module.exports = { executeRequest, injectVariables, extractVariables };