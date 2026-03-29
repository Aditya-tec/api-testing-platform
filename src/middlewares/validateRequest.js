// src/middlewares/validateRequest.js
// Input validation for incoming API requests.
// Runs BEFORE controllers — bad input never reaches business logic.
//
// Validates:
//   - URL format and protocol
//   - HTTP method whitelist
//   - Header key/value sanitization
//   - Body presence and type
//   - Timeout range
//   - Collection-level constraints

const validator = require("validator");
const { validateUrl } = require("../utils/ssrfProtection");

const ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const MAX_TIMEOUT_MS = 30000;  // 30s hard ceiling
const MIN_TIMEOUT_MS = 100;
const MAX_REQUESTS_PER_COLLECTION = 20;
const MAX_HEADER_COUNT = 30;

/**
 * Returns a 400 response. Used inside validators to bail early.
 */
const reject = (res, message, details = null) => {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return res.status(400).json(body);
};

/**
 * Validates a single request definition object.
 * Returns an array of error strings (empty = valid).
 */
const validateRequestDef = (req, index) => {
  const errors = [];
  const label = `requests[${index}]`;

  // Method
  if (!req.method) {
    errors.push(`${label}.method is required`);
  } else if (!ALLOWED_METHODS.includes(req.method.toUpperCase())) {
    errors.push(`${label}.method "${req.method}" is not allowed. Allowed: ${ALLOWED_METHODS.join(", ")}`);
  }

  // URL — basic format check here; SSRF check happens at execution time
  if (!req.url) {
    errors.push(`${label}.url is required`);
  } else if (!validator.isURL(req.url, { protocols: ["http", "https"], require_protocol: true, require_tld: false })) {
    // require_tld: false lets localhost and similar hostnames pass format validation.
    // Whether a host is SAFE to call is SSRF's job — not the format validator's.
    errors.push(`${label}.url "${req.url}" is not a valid URL. Must include http:// or https://`);
  }

  // index must be a non-negative integer
  if (req.index === undefined || req.index === null || !Number.isInteger(req.index) || req.index < 0) {
    errors.push(`${label}.index must be a non-negative integer`);
  }

  // Timeout range check
  if (req.timeoutMs !== undefined) {
    if (typeof req.timeoutMs !== "number" || req.timeoutMs < MIN_TIMEOUT_MS || req.timeoutMs > MAX_TIMEOUT_MS) {
      errors.push(`${label}.timeoutMs must be between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS}`);
    }
  }

  // Header validation
  if (req.headers) {
    if (typeof req.headers !== "object" || Array.isArray(req.headers)) {
      errors.push(`${label}.headers must be a key-value object`);
    } else {
      const headerEntries = Object.entries(req.headers);

      if (headerEntries.length > MAX_HEADER_COUNT) {
        errors.push(`${label}.headers exceeds maximum of ${MAX_HEADER_COUNT} headers`);
      }

      for (const [key, value] of headerEntries) {
        // Block headers that could override security controls
        const blocked = ["host", "content-length", "transfer-encoding", "connection"];
        if (blocked.includes(key.toLowerCase())) {
          errors.push(`${label}.headers: "${key}" is a restricted header and cannot be set`);
        }
        if (typeof value !== "string") {
          errors.push(`${label}.headers["${key}"] value must be a string`);
        }
      }
    }
  }

  // Extract rules
  if (req.extract) {
    if (!Array.isArray(req.extract)) {
      errors.push(`${label}.extract must be an array`);
    } else {
      req.extract.forEach((rule, i) => {
        if (!rule.variable || typeof rule.variable !== "string") {
          errors.push(`${label}.extract[${i}].variable is required and must be a string`);
        }
        if (!rule.from || typeof rule.from !== "string") {
          errors.push(`${label}.extract[${i}].from is required and must be a string`);
        }
      });
    }
  }

  return errors;
};

// ─── Middleware: Validate POST /collections ───────────────────────────────────

const validateCollection = (req, res, next) => {
  const { name, requests, executionMode, auth } = req.body;
  const errors = [];

  // Name
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    errors.push("name is required and must be a non-empty string");
  }

  // executionMode
  if (executionMode && !["sequential", "parallel"].includes(executionMode)) {
    errors.push(`executionMode must be "sequential" or "parallel"`);
  }

  // Auth
  if (auth) {
    const allowedAuthTypes = ["none", "bearer", "apiKey"];
    if (!allowedAuthTypes.includes(auth.type)) {
      errors.push(`auth.type must be one of: ${allowedAuthTypes.join(", ")}`);
    }
    if (auth.type === "bearer" && !auth.token) {
      errors.push("auth.token is required when auth.type is 'bearer'");
    }
    if (auth.type === "apiKey" && (!auth.token || !auth.headerName)) {
      errors.push("auth.token and auth.headerName are required when auth.type is 'apiKey'");
    }
  }

  // Requests array
  if (!requests || !Array.isArray(requests) || requests.length === 0) {
    errors.push("requests must be a non-empty array");
  } else {
    if (requests.length > MAX_REQUESTS_PER_COLLECTION) {
      errors.push(`A collection cannot have more than ${MAX_REQUESTS_PER_COLLECTION} requests`);
    }

    // Validate each request definition
    requests.forEach((reqDef, i) => {
      errors.push(...validateRequestDef(reqDef, i));
    });

    // Check for duplicate indexes
    const indexes = requests.map((r) => r.index);
    const uniqueIndexes = new Set(indexes);
    if (uniqueIndexes.size !== indexes.length) {
      errors.push("requests must have unique index values");
    }
  }

  if (errors.length > 0) {
    return reject(res, "Validation failed", errors);
  }

  next();
};

// ─── Middleware: Validate POST /jobs ──────────────────────────────────────────

const validateJob = (req, res, next) => {
  const { collectionId } = req.body;

  if (!collectionId || typeof collectionId !== "string") {
    return reject(res, "collectionId is required and must be a string");
  }

  // Basic ObjectId format check (24 hex chars)
  if (!/^[a-f\d]{24}$/i.test(collectionId)) {
    return reject(res, "collectionId is not a valid ID");
  }

  next();
};

module.exports = { validateCollection, validateJob };