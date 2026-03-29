// frontend/components/StatusBadge.jsx
// Consistent color-coded status pill used across all pages.

const colors = {
  COMPLETED: "bg-green-100 text-green-800",
  FAILED:    "bg-red-100 text-red-800",
  PARTIAL:   "bg-yellow-100 text-yellow-800",
  RUNNING:   "bg-blue-100 text-blue-800",
  PENDING:   "bg-gray-100 text-gray-600",
  SKIPPED:   "bg-purple-100 text-purple-700",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[status] || "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}