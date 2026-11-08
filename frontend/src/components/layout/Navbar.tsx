"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { notificationService } from "@/services/notification.service";
import type { Notification } from "@/types";
import {
  BookOpen, Menu, X, ChevronDown, User, LogOut,
  GraduationCap, Bell, CheckCheck, Calendar,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDate(dateStr);
}

// ─── Notification Dropdown ─────────────────────────────────────────────────────

function NotificationDropdown({
  notifications, unreadCount, onMarkRead, onMarkAll, onClose,
}: {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: number, url?: string | null) => void;
  onMarkAll: () => void;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl z-50">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="text-sm font-semibold text-gray-900">
          Notifications {unreadCount > 0 && <span className="ml-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-xs font-medium text-white">{unreadCount}</span>}
        </span>
        {unreadCount > 0 && (
          <button onClick={onMarkAll} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No notifications</div>
        ) : (
          notifications.slice(0, 15).map((n) => (
            <button
              key={n.id}
              onClick={() => { onMarkRead(n.id, n.link_url); onClose(); if (n.link_url) router.push(n.link_url); }}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0",
                !n.is_read && "bg-indigo-50/50"
              )}
            >
              <div className="flex items-start gap-2">
                {!n.is_read && <span className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-indigo-500" />}
                {n.is_read && <span className="mt-1.5 flex-shrink-0 h-2 w-2" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-900 truncate">{n.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Navbar ─────────────────────────────────────────────────────────────────────

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Poll notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch { /* silent */ }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) { setNotifications([]); setUnreadCount(0); return; }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  const handleLogout = async () => {
    setDropdownOpen(false); setMobileOpen(false);
    await logout();
    router.push("/");
  };

  async function handleMarkRead(id: number, _url?: string | null) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    try { await notificationService.markAsRead(id); } catch { /* silent */ }
  }

  async function handleMarkAll() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try { await notificationService.markAllAsRead(); } catch { /* silent */ }
  }

  const isTutor = user?.role === "tutor";

  const navLinks = [
    { href: "/marketplace", label: "Marketplace" },
    ...(isAuthenticated && !isTutor ? [{ href: "/dashboard", label: "My Sessions" }] : []),
    ...(isAuthenticated && isTutor  ? [{ href: "/dashboard/tutor", label: "Dashboard" }, { href: "/offerings", label: "My Offerings" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 group-hover:bg-indigo-700 transition-colors">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">SkillBridge</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:text-indigo-600 hover:bg-indigo-50"
                )}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && user ? (
              <>
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => { setNotifOpen((v) => !v); if (!notifOpen) fetchNotifications(); }}
                    className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <NotificationDropdown
                      notifications={notifications}
                      unreadCount={unreadCount}
                      onMarkRead={handleMarkRead}
                      onMarkAll={handleMarkAll}
                      onClose={() => setNotifOpen(false)}
                    />
                  )}
                </div>

                {/* User Menu */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                      {getInitials(user.full_name)}
                    </div>
                    <span className="max-w-[120px] truncate">{user.full_name}</span>
                    <span className={cn("inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium", isTutor ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700")}>
                      {user.role}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", dropdownOpen && "rotate-180")} />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg z-50">
                      <div className="border-b border-gray-100 px-3 py-2">
                        <p className="text-xs font-medium text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Link href="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                        <User className="h-4 w-4" /> My Profile
                      </Link>
                      {!isTutor && (
                        <Link href="/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                          <Calendar className="h-4 w-4" /> My Sessions
                        </Link>
                      )}
                      {isTutor && (
                        <>
                          <Link href="/dashboard/tutor" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                            <Calendar className="h-4 w-4" /> Dashboard
                          </Link>
                          <Link href="/offerings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                            <GraduationCap className="h-4 w-4" /> My Offerings
                          </Link>
                        </>
                      )}
                      <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Sign In</Link>
                <Link href="/register" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen((v) => !v)} className="md:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Toggle mobile menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 pb-4 pt-2">
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                  className={cn("block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    pathname === link.href ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:text-indigo-600 hover:bg-indigo-50"
                  )}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
              {isAuthenticated && user ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{getInitials(user.full_name)}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="ml-auto rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">{unreadCount}</span>
                    )}
                  </div>
                  <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50"><User className="h-4 w-4" /> My Profile</Link>
                  {!isTutor && <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50"><Calendar className="h-4 w-4" /> My Sessions</Link>}
                  {isTutor && <>
                    <Link href="/dashboard/tutor" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50"><Calendar className="h-4 w-4" /> Dashboard</Link>
                    <Link href="/offerings" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50"><GraduationCap className="h-4 w-4" /> My Offerings</Link>
                  </>}
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Sign Out</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Sign In</Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="block rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700">Get Started</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
