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

  if (loading) return <p className="terminal-muted">Loading job...</p>;
  if (!job) return <p className="text-[#ffb3bb]">Job not found.</p>;

  const isLive = !TERMINAL_STATUSES.includes(job.status);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-sm terminal-muted hover:text-[#dbeedb]">← Collections</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-semibold tracking-[0.18em] uppercase text-[#f2fff2]">Job Detail</h1>
          <StatusBadge status={job.status} />
          {isLive && (
            <span className="text-xs text-[#8cc9ff] animate-pulse">● live</span>
          )}
        </div>
        <p className="mt-1 text-xs terminal-code terminal-muted">{job._id}</p>
      </div>

      {/* Job metadata */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Mode", value: job.executionMode },
          { label: "Started", value: job.startedAt ? new Date(job.startedAt).toLocaleTimeString() : "—" },
          { label: "Duration", value: job.durationMs ? `${job.durationMs}ms` : "—" },
          { label: "Collection", value: (
            <Link href={`/collections/${job.collectionId}`} className="terminal-link underline text-sm">
              View →
            </Link>
          )},
        ].map(({ label, value }) => (
          <div key={label} className="terminal-panel px-4 py-3">
            <p className="text-xs terminal-muted">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-[#f0fff0]">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-4 border-b border-[#223244]">
        {["results", "logs"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#9fd0ad] text-[#f0fff0]"
                : "border-transparent text-[#7f9680] hover:text-[#c8e8cf]"
            }`}
          >
            {tab}
            <span className="ml-1.5 rounded-full border border-[#2a3b52] bg-[#101826] px-1.5 py-0.5 text-xs text-[#9fb09f]">
              {tab === "results" ? results.length : logs.length}
            </span>
          </button>
        ))}
      </div>

      {/* Results tab */}
      {activeTab === "results" && (
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r._id} className="terminal-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs terminal-code terminal-muted">#{r.requestIndex}</span>
                  <span className="font-medium text-[#dbeedb]">{r.requestName}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center gap-4 text-xs terminal-muted">
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
                <div className="mb-2 rounded border border-[#5a3030] bg-[#2a1216] px-3 py-2 text-xs text-[#ffb3bb] terminal-code">
                  {r.errorMessage}
                </div>
              )}

              {r.responseSnippet && (
                <pre className="terminal-panel-strong overflow-x-auto rounded px-3 py-2 text-xs text-[#d5e7d5] whitespace-pre-wrap break-all">
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
        <div className="terminal-panel-strong max-h-[500px] space-y-1.5 overflow-y-auto p-4 text-xs text-[#d5e7d5] terminal-code">
          {logs.map((log) => (
            <div key={log._id} className="flex gap-4">
              <span className="shrink-0 text-[#7f9680]">
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
              <span className="truncate text-[#9fb09f]">
                {JSON.stringify(log.meta)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}