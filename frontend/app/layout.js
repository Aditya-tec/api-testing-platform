import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "API Testing Platform",
  description: "Run and monitor API test collections",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen text-gray-900">
    
        <Navbar />
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}