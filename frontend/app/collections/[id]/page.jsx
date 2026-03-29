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

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!collection) return <p className="text-red-500">Collection not found.</p>;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Collections</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{collection.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {collection.executionMode} · {collection.requests.length} request{collection.requests.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {latestJobId && (
            <Link href={`/jobs/${latestJobId}`} className="text-sm text-blue-600 underline">
              View latest job →
            </Link>
          )}
          <button
            onClick={handleRun}
            disabled={running}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50 transition"
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
            <div key={label} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-lg font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Requests in this collection */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Requests</h2>
        <div className="space-y-2">
          {collection.requests.map((req) => (
            <div key={req.index} className="bg-white border border-gray-200 rounded px-4 py-3 flex items-center gap-4">
              <span className="text-xs font-bold text-gray-400 w-4">{req.index}</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                req.method === "GET" ? "bg-blue-100 text-blue-700" :
                req.method === "POST" ? "bg-green-100 text-green-700" :
                req.method === "DELETE" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>{req.method}</span>
              <span className="text-sm font-mono text-gray-700 truncate">{req.url}</span>
              <span className="text-xs text-gray-400 ml-auto">{req.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-request latency */}
      {metrics?.requests?.perRequest?.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Latency by Request</h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-right">Avg</th>
                  <th className="px-4 py-2 text-right">Min</th>
                  <th className="px-4 py-2 text-right">Max</th>
                  <th className="px-4 py-2 text-right">Runs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.requests.perRequest.map((r) => (
                  <tr key={r.requestIndex}>
                    <td className="px-4 py-2 text-gray-400">{r.requestIndex}</td>
                    <td className="px-4 py-2 text-gray-700">{r.requestName}</td>
                    <td className="px-4 py-2 text-right font-mono">{r.avgLatencyMs}ms</td>
                    <td className="px-4 py-2 text-right font-mono text-green-600">{r.minLatencyMs}ms</td>
                    <td className="px-4 py-2 text-right font-mono text-red-500">{r.maxLatencyMs}ms</td>
                    <td className="px-4 py-2 text-right text-gray-400">{r.totalRuns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Job history */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Run History</h2>
        {jobs.length === 0 ? (
          <p className="text-gray-400 text-sm">No runs yet.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <Link
                key={job._id}
                href={`/jobs/${job._id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded px-4 py-3 hover:border-gray-400 transition"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={job.status} />
                  <span className="text-xs font-mono text-gray-400">{job._id}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{new Date(job.createdAt).toLocaleString()}</p>
                  {job.durationMs && (
                    <p className="text-xs text-gray-500">{job.durationMs}ms</p>
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