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

  if (loading) return <p className="text-gray-500">Loading collections...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
        <Link
          href="/collections/new"
          className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition"
        >
          + New Collection
        </Link>
      </div>

      {collections.length === 0 ? (
        <p className="text-gray-500">No collections yet. Create one to get started.</p>
      ) : (
        <div className="space-y-3">
          {collections.map((col) => (
            <div
              key={col._id}
              className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-center justify-between"
            >
              <div>
                <Link
                  href={`/collections/${col._id}`}
                  className="font-semibold text-gray-900 hover:underline"
                >
                  {col.name}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">
                  {col.executionMode} · created {new Date(col.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {runningJobs[col._id] ? (
                  <Link
                    href={`/jobs/${runningJobs[col._id]}`}
                    className="text-xs text-blue-600 underline"
                  >
                    View job →
                  </Link>
                ) : (
                  <button
                    onClick={() => handleRun(col._id)}
                    className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 transition"
                  >
                    ▶ Run
                  </button>
                )}
                <Link
                  href={`/collections/${col._id}`}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Details
                </Link>
                <button
                  onClick={() => handleDelete(col._id)}
                  className="text-sm text-red-400 hover:text-red-600"
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