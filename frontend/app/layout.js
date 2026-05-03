import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "API Testing Platform",
  description: "Run and monitor API test collections",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="terminal-shell min-h-screen text-[#d5e7d5]">
    
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
      </body>
    </html>
  );
}