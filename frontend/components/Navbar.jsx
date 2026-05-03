// frontend/components/Navbar.jsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",            label: "Collections" },
  { href: "/collections/new", label: "New Collection" },
  { href: "/metrics",     label: "Metrics" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-3 border-b border-[#1a1f1d] bg-[#020202] px-4 py-3 text-[#e7ece7] md:flex-row md:items-center md:gap-8 md:px-6">
      <span className="text-base font-semibold tracking-[0.24em] uppercase text-[#d6ddd6]">API Tester</span>
      <div className="flex gap-6">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm transition-colors ${
              pathname === href ? "text-[#f5f7f5]" : "text-[#9aa19a] hover:text-[#eef2ee]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}