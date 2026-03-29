"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getJob, getJobResults, getJobLogs } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

const POLL_INTERVAL = 3000; // 3 seconds
const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "PARTIAL"];

export default function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [results, setResults] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("results");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [jobRes, resultsRes, logsRes] = await Promise.all([
      getJob(id),
      getJobResults(id),
      getJobLogs(id),
    ]);
    setJob(jobRes.data);
    setResults(resultsRes.data);
    setLogs(logsRes.data);
    return jobRes.data.status;
  }, [id]);

  useEffect(() => {
    let interval;

    const init = async () => {
      try {
        const status = await fetchAll();
        setLoading(false);

        // Only poll if job is still in progress
        if (!TERMINAL_STATUSES.includes(status)) {
          interval = setInterval(async () => {
            const newStatus = await fetchAll();
            if (TERMINAL_STATUSES.includes(newStatus)) {
              clearInterval(interval);
            }
          }, POLL_INTERVAL);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    init();
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) return <p className="text-gray-500">Loading job...</p>;
  if (!job) return <p className="text-red-500">Job not found.</p>;

  const isLive = !TERMINAL_STATUSES.includes(job.status);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Collections</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-gray-900">Job Detail</h1>
          <StatusBadge status={job.status} />
          {isLive && (
            <span className="text-xs text-blue-500 animate-pulse">● live</span>
          )}
        </div>
        <p className="text-xs font-mono text-gray-400 mt-1">{job._id}</p>
      </div>

      {/* Job metadata */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Mode", value: job.executionMode },
          { label: "Started", value: job.startedAt ? new Date(job.startedAt).toLocaleTimeString() : "—" },
          { label: "Duration", value: job.durationMs ? `${job.durationMs}ms` : "—" },
          { label: "Collection", value: (
            <Link href={`/collections/${job.collectionId}`} className="text-blue-600 hover:underline text-sm">
              View →
            </Link>
          )},
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-4">
        {["results", "logs"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab}
            <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">
              {tab === "results" ? results.length : logs.length}
            </span>
          </button>
        ))}
      </div>

      {/* Results tab */}
      {activeTab === "results" && (
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r._id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono">#{r.requestIndex}</span>
                  <span className="font-medium text-gray-800">{r.requestName}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  {r.httpStatus && (
                    <span className={`font-mono font-semibold ${
                      r.httpStatus < 300 ? "text-green-600" :
                      r.httpStatus < 400 ? "text-yellow-600" : "text-red-600"
                    }`}>{r.httpStatus}</span>
                  )}
                  {r.latencyMs && <span>{r.latencyMs}ms</span>}
                  {r.retryCount > 0 && <span className="text-yellow-600">{r.retryCount} retries</span>}
                </div>
              </div>

              {r.errorMessage && (
                <div className="bg-red-50 border border-red-100 rounded px-3 py-2 text-xs text-red-700 font-mono mb-2">
                  {r.errorMessage}
                </div>
              )}

              {r.responseSnippet && (
                <pre className="bg-gray-50 border border-gray-100 rounded px-3 py-2 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap break-all">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(r.responseSnippet), null, 2);
                    } catch {
                      return r.responseSnippet;
                    }
                  })()}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Logs tab */}
      {activeTab === "logs" && (
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-300 space-y-1.5 max-h-[500px] overflow-y-auto">
          {logs.map((log) => (
            <div key={log._id} className="flex gap-4">
              <span className="text-gray-500 shrink-0">
                {new Date(log.timestamp).toISOString().slice(11, 23)}
              </span>
              <span className={`shrink-0 font-semibold ${
                log.event.includes("FAILED") ? "text-red-400" :
                log.event.includes("COMPLETED") ? "text-green-400" :
                log.event.includes("SKIPPED") ? "text-purple-400" :
                log.event.includes("VAR_") ? "text-yellow-400" :
                "text-blue-400"
              }`}>
                {log.event}
              </span>
              <span className="text-gray-400 truncate">
                {JSON.stringify(log.meta)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}