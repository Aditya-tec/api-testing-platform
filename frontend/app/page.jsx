"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getCollections, createJob, deleteCollection } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningJobs, setRunningJobs] = useState({}); // collectionId → jobId

  useEffect(() => {
    getCollections()
      .then((res) => setCollections(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRun = async (collectionId) => {
    try {
      const res = await createJob(collectionId);
      const jobId = res.data._id;
      setRunningJobs((prev) => ({ ...prev, [collectionId]: jobId }));
      // Brief flash so user sees the job was created
      setTimeout(() => {
        setRunningJobs((prev) => {
          const next = { ...prev };
          delete next[collectionId];
          return next;
        });
      }, 2000);
    } catch (err) {
      alert(`Failed to start job: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this collection?")) return;
    try {
      await deleteCollection(id);
      setCollections((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  if (loading) return <p className="terminal-muted">Loading collections...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[0.18em] uppercase text-[#f2fff2]">Collections</h1>
          <p className="mt-1 text-sm terminal-muted">Manage request sets and run them like jobs in a console.</p>
        </div>
        <Link
          href="/collections/new"
          className="terminal-button"
        >
          + New Collection
        </Link>
      </div>

      {collections.length === 0 ? (
        <p className="terminal-muted">No collections yet. Create one to get started.</p>
      ) : (
        <div className="space-y-3">
          {collections.map((col) => (
            <div
              key={col._id}
              className="terminal-panel flex items-center justify-between gap-4 px-5 py-4"
            >
              <div>
                <Link
                  href={`/collections/${col._id}`}
                  className="font-semibold text-[#f0fff0] hover:underline"
                >
                  {col.name}
                </Link>
                <p className="mt-0.5 text-xs terminal-muted">
                  {col.executionMode} · created {new Date(col.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {runningJobs[col._id] ? (
                  <Link
                    href={`/jobs/${runningJobs[col._id]}`}
                    className="text-xs terminal-link underline"
                  >
                    View job →
                  </Link>
                ) : (
                  <button
                    onClick={() => handleRun(col._id)}
                    className="terminal-button px-3 py-1.5 text-sm"
                  >
                    ▶ Run
                  </button>
                )}
                <Link
                  href={`/collections/${col._id}`}
                  className="text-sm terminal-muted hover:text-[#dbeedb]"
                >
                  Details
                </Link>
                <button
                  onClick={() => handleDelete(col._id)}
                  className="text-sm text-[#ef8f99] hover:text-[#ffb9c1]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}