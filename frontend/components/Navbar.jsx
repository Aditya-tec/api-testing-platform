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
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center gap-8">
      <span className="font-bold text-lg tracking-tight">API Tester</span>
      <div className="flex gap-6">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm hover:text-white transition-colors ${
              pathname === href ? "text-white font-semibold" : "text-gray-400"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}