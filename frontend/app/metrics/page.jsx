"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getGlobalMetrics } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

export default function MetricsPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGlobalMetrics()
      .then((res) => setMetrics(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="terminal-muted">Loading metrics...</p>;
  if (!metrics) return <p className="text-[#ffb3bb]">Failed to load metrics.</p>;

  const { jobs, requests, recentFailures } = metrics;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-[0.18em] uppercase text-[#f2fff2]">System Metrics</h1>

      {/* Job stats */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#8fa28f]">Jobs</h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="terminal-panel px-4 py-3">
          <p className="text-xs terminal-muted">Total Jobs</p>
          <p className="text-2xl font-semibold text-[#f0fff0]">{jobs.total}</p>
        </div>
        <div className="terminal-panel px-4 py-3">
          <p className="text-xs terminal-muted">Success Rate</p>
          <p className="text-2xl font-semibold text-[#8fe0a2]">{jobs.successRate}</p>
        </div>
        <div className="terminal-panel px-4 py-3">
          <p className="text-xs terminal-muted">By Status</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(jobs.byStatus).filter(([, v]) => v > 0).map(([status, count]) => (
              <span key={status} className="text-xs">
                <StatusBadge status={status} /> <span className="text-[#9fb09f]">{count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Request stats */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#8fa28f]">Requests</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="terminal-panel px-4 py-3">
          <p className="text-xs terminal-muted">Total Requests</p>
          <p className="text-2xl font-semibold text-[#f0fff0]">{requests.total}</p>
        </div>
        <div className="terminal-panel px-4 py-3">
          <p className="text-xs terminal-muted">Avg Latency</p>
          <p className="text-2xl font-semibold text-[#f0fff0]">
            {requests.avgLatencyMs ? `${requests.avgLatencyMs}ms` : "—"}
          </p>
        </div>
        <div className="terminal-panel px-4 py-3">
          <p className="text-xs terminal-muted">By Status</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(requests.byStatus).filter(([, v]) => v > 0).map(([status, count]) => (
              <span key={status} className="text-xs">
                <StatusBadge status={status} /> <span className="text-[#9fb09f]">{count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent failures */}
      {recentFailures.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#8fa28f]">Recent Failures</h2>
          <div className="space-y-2">
            {recentFailures.map((job) => (
              <Link
                key={job._id}
                href={`/jobs/${job._id}`}
                className="terminal-panel flex items-center justify-between px-4 py-3 transition hover:border-[#39516b]"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={job.status} />
                  <span className="text-sm text-[#dbeedb]">{job.collectionId?.name || "Unknown collection"}</span>
                </div>
                <span className="text-xs terminal-muted">{new Date(job.createdAt).toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}