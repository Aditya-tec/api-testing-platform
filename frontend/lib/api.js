// frontend/lib/api.js
// All backend communication goes through this file.
// Never call fetch() directly in a page or component.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

const request = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Request failed");
  return data;
};

// ── Collections ───────────────────────────────────────────────────────────────
export const getCollections = () => request("/collections");
export const getCollection = (id) => request(`/collections/${id}`);
export const createCollection = (body) =>
  request("/collections", { method: "POST", body: JSON.stringify(body) });
export const deleteCollection = (id) =>
  request(`/collections/${id}`, { method: "DELETE" });

// ── Jobs ─────────────────────────────────────────────────────────────────────
export const createJob = (collectionId) =>
  request("/jobs", { method: "POST", body: JSON.stringify({ collectionId }) });
export const getJob = (id) => request(`/jobs/${id}`);
export const getJobResults = (id) => request(`/jobs/${id}/results`);
export const getJobLogs = (id) => request(`/jobs/${id}/logs`);
export const getJobsByCollection = (collectionId) =>
  request(`/collections/${collectionId}/jobs`);

// ── Metrics ───────────────────────────────────────────────────────────────────
export const getGlobalMetrics = () => request("/metrics");
export const getCollectionMetrics = (id) => request(`/metrics/collections/${id}`);

// ── Auth Profiles ─────────────────────────────────────────────────────────────
export const getAuthProfiles = () => request("/auth-profiles");
export const createAuthProfile = (body) =>
  request("/auth-profiles", { method: "POST", body: JSON.stringify(body) });