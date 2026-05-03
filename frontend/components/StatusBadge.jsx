// frontend/components/StatusBadge.jsx
// Consistent color-coded status pill used across all pages.

const colors = {
  COMPLETED: "border-[#26312a] bg-[#050505] text-[#bfc9c0]",
  FAILED: "border-[#322627] bg-[#050505] text-[#d7c0c3]",
  PARTIAL: "border-[#302d23] bg-[#050505] text-[#cdc8b3]",
  RUNNING: "border-[#24303a] bg-[#050505] text-[#b4c4d0]",
  PENDING: "border-[#232827] bg-[#050505] text-[#b5bbb6]",
  SKIPPED: "border-[#2e2735] bg-[#050505] text-[#cbbfd9]",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${colors[status] || "border-[#232827] bg-[#050505] text-[#b5bbb6]"}`}>
      {status}
    </span>
  );
}