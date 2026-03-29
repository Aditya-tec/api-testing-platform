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

  if (loading) return <p className="text-gray-500">Loading metrics...</p>;
  if (!metrics) return <p className="text-red-500">Failed to load metrics.</p>;

  const { jobs, requests, recentFailures } = metrics;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Metrics</h1>

      {/* Job stats */}
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Jobs</h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400">Total Jobs</p>
          <p className="text-2xl font-bold text-gray-900">{jobs.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400">Success Rate</p>
          <p className="text-2xl font-bold text-green-600">{jobs.successRate}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400">By Status</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(jobs.byStatus).filter(([, v]) => v > 0).map(([status, count]) => (
              <span key={status} className="text-xs">
                <StatusBadge status={status} /> <span className="text-gray-600">{count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Request stats */}
      <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Requests</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900">{requests.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400">Avg Latency</p>
          <p className="text-2xl font-bold text-gray-900">
            {requests.avgLatencyMs ? `${requests.avgLatencyMs}ms` : "—"}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-400">By Status</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(requests.byStatus).filter(([, v]) => v > 0).map(([status, count]) => (
              <span key={status} className="text-xs">
                <StatusBadge status={status} /> <span className="text-gray-600">{count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent failures */}
      {recentFailures.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Recent Failures</h2>
          <div className="space-y-2">
            {recentFailures.map((job) => (
              <Link
                key={job._id}
                href={`/jobs/${job._id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded px-4 py-3 hover:border-gray-400 transition"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={job.status} />
                  <span className="text-sm text-gray-700">{job.collectionId?.name || "Unknown collection"}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(job.createdAt).toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}