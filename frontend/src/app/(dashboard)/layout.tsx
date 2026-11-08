import { Navbar } from "@/components/layout/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} SkillBridge — Peer-to-peer academic tutoring
          </p>
          <p className="text-xs text-gray-400">
            All sessions are between verified college students
          </p>
        </div>
      </footer>
    </div>
  );
}
