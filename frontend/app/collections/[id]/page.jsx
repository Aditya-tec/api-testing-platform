"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCollection, getJobsByCollection, createJob, getCollectionMetrics } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

export default function CollectionDetailPage() {
  const { id } = useParams();
  const [collection, setCollection] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [latestJobId, setLatestJobId] = useState(null);

  useEffect(() => {
    Promise.all([
      getCollection(id),
      getJobsByCollection(id),
      getCollectionMetrics(id),
    ])
      .then(([col, jobsRes, metricsRes]) => {
        setCollection(col.data);
        setJobs(jobsRes.data);
        setMetrics(metricsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await createJob(id);
      setLatestJobId(res.data._id);
      // Refresh job list
      const jobsRes = await getJobsByCollection(id);
      setJobs(jobsRes.data);
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <p className="terminal-muted">Loading...</p>;
  if (!collection) return <p className="text-[#ffb3bb]">Collection not found.</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/" className="text-sm terminal-muted hover:text-[#dbeedb]">← Collections</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-[0.18em] uppercase text-[#f2fff2]">{collection.name}</h1>
          <p className="mt-0.5 text-sm terminal-muted">
            {collection.executionMode} · {collection.requests.length} request{collection.requests.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {latestJobId && (
            <Link href={`/jobs/${latestJobId}`} className="text-sm terminal-link underline">
              View latest job →
            </Link>
          )}
          <button
            onClick={handleRun}
            disabled={running}
            className="terminal-button px-4 py-2 text-sm"
          >
            {running ? "Starting..." : "▶ Run Now"}
          </button>
        </div>
      </div>

      {/* Metrics bar */}
      {metrics && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Runs", value: metrics.runs.total },
            { label: "Success Rate", value: metrics.runs.successRate },
            { label: "Avg Duration", value: metrics.runs.avgJobDurationMs ? `${metrics.runs.avgJobDurationMs}ms` : "—" },
            { label: "Requests Run", value: Object.values(metrics.requests.byStatus).reduce((a, b) => a + b, 0) },
          ].map(({ label, value }) => (
            <div key={label} className="terminal-panel px-4 py-3">
              <p className="text-xs terminal-muted">{label}</p>
              <p className="text-lg font-semibold text-[#f0fff0]">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Requests in this collection */}
      <div className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-[#8fa28f]">Requests</h2>
        <div className="space-y-2">
          {collection.requests.map((req) => (
            <div key={req.index} className="terminal-panel flex items-center gap-4 px-4 py-3">
              <span className="w-4 text-xs font-bold terminal-muted">{req.index}</span>
              <span className={`rounded border px-2 py-0.5 text-xs font-bold terminal-code ${
                req.method === "GET" ? "border-[#1f4f78] bg-[#0d1b2a] text-[#8cc9ff]" :
                req.method === "POST" ? "border-[#28553d] bg-[#10261a] text-[#8fe0a2]" :
                req.method === "DELETE" ? "border-[#642b31] bg-[#2a1216] text-[#ffb3bb]" :
                "border-[#5a4a25] bg-[#231d10] text-[#f1d58b]"
              }`}>{req.method}</span>
              <span className="terminal-code text-sm text-[#dbeedb] truncate">{req.url}</span>
              <span className="ml-auto text-xs terminal-muted">{req.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-request latency */}
      {metrics?.requests?.perRequest?.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-[#8fa28f]">Latency by Request</h2>
          <div className="terminal-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#0f1726] text-xs uppercase text-[#8fa28f]">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-right">Avg</th>
                  <th className="px-4 py-2 text-right">Min</th>
                  <th className="px-4 py-2 text-right">Max</th>
                  <th className="px-4 py-2 text-right">Runs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#223244]">
                {metrics.requests.perRequest.map((r) => (
                  <tr key={r.requestIndex}>
                    <td className="px-4 py-2 terminal-muted">{r.requestIndex}</td>
                    <td className="px-4 py-2 text-[#dbeedb]">{r.requestName}</td>
                    <td className="px-4 py-2 text-right font-mono">{r.avgLatencyMs}ms</td>
                    <td className="px-4 py-2 text-right font-mono text-[#8fe0a2]">{r.minLatencyMs}ms</td>
                    <td className="px-4 py-2 text-right font-mono text-[#ffb3bb]">{r.maxLatencyMs}ms</td>
                    <td className="px-4 py-2 text-right terminal-muted">{r.totalRuns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Job history */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-[#8fa28f]">Run History</h2>
        {jobs.length === 0 ? (
          <p className="text-sm terminal-muted">No runs yet.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <Link
                key={job._id}
                href={`/jobs/${job._id}`}
                className="terminal-panel flex items-center justify-between px-4 py-3 transition hover:border-[#39516b]"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={job.status} />
                  <span className="text-xs terminal-code terminal-muted">{job._id}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs terminal-muted">{new Date(job.createdAt).toLocaleString()}</p>
                  {job.durationMs && (
                    <p className="text-xs text-[#9fb09f]">{job.durationMs}ms</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}