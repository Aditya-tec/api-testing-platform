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
    <div className="max-w-3xl">
      <h1 className="mb-3 text-2xl font-semibold tracking-[0.18em] uppercase text-[#f2fff2]">
        New Collection
      </h1>
      <p className="mb-6 text-sm terminal-muted">Build the collection as a set of terminal-style request blocks.</p>

      {error && (
        <div className="terminal-panel mb-5 border-[#5a3030] bg-[#2a1216] px-4 py-3 text-sm text-[#ffb3bb]">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-[#cfe0cf]">Collection Name</label>
        <input
          className="terminal-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My API Collection"
        />
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-[#cfe0cf]">Execution Mode</label>
        <select
          className="terminal-input max-w-xs"
          value={executionMode}
          onChange={(e) => setExecutionMode(e.target.value)}
        >
          <option value="sequential">Sequential</option>
          <option value="parallel">Parallel</option>
        </select>
      </div>

      {authProfiles.length > 0 && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-[#cfe0cf]">Auth Profile (optional)</label>
          <select
            className="terminal-input max-w-md"
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

      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <label className="text-sm font-medium text-[#cfe0cf]">Requests</label>
          <button
            onClick={addRequest}
            className="text-sm text-[#8fd1a5] hover:text-[#b7f0c7]"
          >
            + Add Request
          </button>
        </div>

        {requests.map((req, i) => (
          <div key={i} className="terminal-panel mb-3 px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-[0.12em] uppercase terminal-muted">Request {i + 1}</span>
              {requests.length > 1 && (
                <button
                  onClick={() => removeRequest(i)}
                  className="text-xs text-[#ef8f99] hover:text-[#ffb9c1]"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mb-3 grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs terminal-muted">Name</label>
                <input
                  className="terminal-input py-2 text-sm"
                  value={req.name}
                  onChange={(e) => updateRequest(i, "name", e.target.value)}
                  placeholder="Get Users"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs terminal-muted">Method</label>
                <select
                  className="terminal-input py-2 text-sm"
                  value={req.method}
                  onChange={(e) => updateRequest(i, "method", e.target.value)}
                >
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs terminal-muted">Timeout (ms)</label>
                <input
                  type="number"
                  className="terminal-input py-2 text-sm"
                  value={req.timeoutMs}
                  onChange={(e) => updateRequest(i, "timeoutMs", Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs terminal-muted">URL</label>
              <input
                className="terminal-input terminal-code py-2 text-sm"
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
        className="terminal-button"
      >
        {submitting ? "Creating..." : "Create Collection"}
      </button>
    </div>
  );
}