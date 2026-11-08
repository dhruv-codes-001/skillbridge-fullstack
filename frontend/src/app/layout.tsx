import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "SkillBridge — Peer-to-Peer Academic Tutoring",
  description:
    "Connect with fellow students for personalized academic tutoring. Find tutors or share your knowledge on SkillBridge.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 font-sans antialiased text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
