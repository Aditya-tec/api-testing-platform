"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCollection, getAuthProfiles } from "@/lib/api";

const emptyRequest = (index) => ({
  index,
  name: "",
  method: "GET",
  url: "",
  headers: {},
  body: null,
  extract: [],
  timeoutMs: 10000,
});

export default function NewCollectionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [executionMode, setExecutionMode] = useState("sequential");
  const [authProfileId, setAuthProfileId] = useState("");
  const [authProfiles, setAuthProfiles] = useState([]);
  const [requests, setRequests] = useState([emptyRequest(0)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAuthProfiles()
      .then((res) => setAuthProfiles(res.data))
      .catch(() => {});
  }, []);

  const updateRequest = (i, field, value) => {
    setRequests((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r))
    );
  };

  const addRequest = () => {
    setRequests((prev) => [...prev, emptyRequest(prev.length)]);
  };

  const removeRequest = (i) => {
    setRequests((prev) =>
      prev.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, index: idx }))
    );
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await createCollection({
        name,
        executionMode,
        authProfileId: authProfileId || undefined,
        requests,
      });
      router.push(`/collections/${res.data._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
        New Collection
      </h1>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 6, padding: "12px 16px", marginBottom: 20, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Collection Name</label>
        <input
          style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 12px", fontSize: 14, background: "#fff", color: "#111" }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My API Collection"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Execution Mode</label>
        <select
          style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 12px", fontSize: 14, background: "#fff", color: "#111" }}
          value={executionMode}
          onChange={(e) => setExecutionMode(e.target.value)}
        >
          <option value="sequential">Sequential</option>
          <option value="parallel">Parallel</option>
        </select>
      </div>

      {authProfiles.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Auth Profile (optional)</label>
          <select
            style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 12px", fontSize: 14, background: "#fff", color: "#111" }}
            value={authProfileId}
            onChange={(e) => setAuthProfileId(e.target.value)}
          >
            <option value="">None</option>
            {authProfiles.map((p) => (
              <option key={p._id} value={p._id}>{p.name} ({p.type})</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <label style={{ fontSize: 14, fontWeight: 500 }}>Requests</label>
          <button
            onClick={addRequest}
            style={{ fontSize: 13, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}
          >
            + Add Request
          </button>
        </div>

        {requests.map((req, i) => (
          <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 12, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Request {i + 1}</span>
              {requests.length > 1 && (
                <button
                  onClick={() => removeRequest(i)}
                  style={{ fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
                >
                  Remove
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Name</label>
                <input
                  style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 4, padding: "6px 10px", fontSize: 13, background: "#fff", color: "#111" }}
                  value={req.name}
                  onChange={(e) => updateRequest(i, "name", e.target.value)}
                  placeholder="Get Users"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Method</label>
                <select
                  style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 4, padding: "6px 10px", fontSize: 13, background: "#fff", color: "#111" }}
                  value={req.method}
                  onChange={(e) => updateRequest(i, "method", e.target.value)}
                >
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Timeout (ms)</label>
                <input
                  type="number"
                  style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 4, padding: "6px 10px", fontSize: 13, background: "#fff", color: "#111" }}
                  value={req.timeoutMs}
                  onChange={(e) => updateRequest(i, "timeoutMs", Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>URL</label>
              <input
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 4, padding: "6px 10px", fontSize: 13, fontFamily: "monospace", background: "#fff", color: "#111" }}
                value={req.url}
                onChange={(e) => updateRequest(i, "url", e.target.value)}
                placeholder="https://api.example.com/endpoint"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{ background: "#111827", color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontSize: 14, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? "Creating..." : "Create Collection"}
      </button>
    </div>
  );
}