"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { tutorService } from "@/services/tutor.service";
import { TutorCard } from "@/components/marketplace/TutorCard";
import {
  BookOpen,
  Users,
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import type { TutorMarketplaceCard } from "@/types";

const features = [
  {
    icon: Users,
    title: "Campus-to-Campus Learning",
    description:
      "Learn from seniors and peers at top Indian universities who mastered the exact same course curriculum and exam patterns.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: GraduationCap,
    title: "Semester & Syllabus Aligned",
    description:
      "Targeted doubt-clearing for your mid-sems, lab assignments, and university end-sems without rote memorisation.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Zap,
    title: "Transparent Pricing in Rupees",
    description:
      "Fair, student-friendly hourly rates in ₹ directly set by tutors. No hidden commission or platform subscription lock-ins.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Shield,
    title: "Flexible Peer Scheduling",
    description:
      "Schedule 1-on-1 sessions around your lecture timetable. Automated conflict prevention ensures sessions never overlap.",
    color: "bg-purple-50 text-purple-600",
  },
];

const highlights = [
  "Learn from seniors who aced your university syllabus",
  "Affordable hourly rates in ₹ with zero hidden charges",
  "Targeted preparation for mid-sems, finals, and lab vivas",
  "Verified peer community across top colleges",
];

export default function LandingPage() {
  const [featuredTutors, setFeaturedTutors] = useState<TutorMarketplaceCard[]>([]);
  const [totalTutors, setTotalTutors] = useState<number | null>(null);
  const [isLoadingTutors, setIsLoadingTutors] = useState(true);

  useEffect(() => {
    tutorService
      .searchTutors({ size: 3 })
      .then((res) => {
        setFeaturedTutors(res.items);
        setTotalTutors(res.total);
      })
      .catch(() => {
        // Fallback gracefully if backend is spinning up
      })
      .finally(() => {
        setIsLoadingTutors(false);
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 group-hover:bg-indigo-700 transition-colors">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">SkillBridge</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/marketplace"
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
            >
              Browse Tutors
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 py-24 sm:py-32">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-4 py-1.5 text-xs sm:text-sm font-medium text-indigo-100">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Peer-to-peer academic tutoring for college students
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Learn from peers. <span className="text-indigo-200">Grow together.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-indigo-100 leading-relaxed">
              Affordable tutoring from students who understand your subjects, your syllabus and your college experience.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 transition-colors"
              >
                Browse Tutors
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register?role=tutor"
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-500/20 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-500/40 transition-colors"
              >
                Become a Tutor
              </Link>
            </div>
          </div>
        </section>

        {/* Truthful Platform Statistics Banner */}
        <section className="bg-indigo-900 py-8 border-y border-indigo-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">
                  {totalTutors !== null ? `${totalTutors}` : "Verified"}
                </div>
                <div className="mt-1 text-xs sm:text-sm text-indigo-300">
                  {totalTutors !== null ? "Registered Peer Tutors" : "Peer Tutors"}
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">₹0</div>
                <div className="mt-1 text-xs sm:text-sm text-indigo-300">Platform Commission</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">100%</div>
                <div className="mt-1 text-xs sm:text-sm text-indigo-300">College Students</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">1-on-1</div>
                <div className="mt-1 text-xs sm:text-sm text-indigo-300">Doubt Mentorship</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900">
                Built specifically for Indian college students
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                No generic tutorials. Get personalized guidance from students who recently solved the exact same exam papers.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className={`inline-flex rounded-lg p-3 ${feature.color} mb-4`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Real Tutors from Database */}
        {featuredTutors.length > 0 && (
          <section className="py-16 bg-gray-50 border-t border-gray-200">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Meet Verified Peer Tutors</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    High-performing students ready to mentor you in your college subjects
                  </p>
                </div>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  View all tutors
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featuredTutors.map((tutor) => (
                  <TutorCard key={tutor.id} tutor={tutor} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA section */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-700 p-8 sm:p-12 lg:flex lg:items-center lg:gap-12 shadow-sm">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  Ace your semester exams with confidence
                </h2>
                <ul className="mt-6 space-y-3">
                  {highlights.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-indigo-100 text-sm">
                      <CheckCircle className="h-4 w-4 text-indigo-300 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 lg:mt-0 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/marketplace"
                  className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors text-center"
                >
                  Find a Tutor
                </Link>
                <Link
                  href="/register?role=tutor"
                  className="rounded-lg border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors text-center"
                >
                  Start Tutoring
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600">
              <BookOpen className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">SkillBridge</span>
          </div>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} SkillBridge. Peer-to-peer academic tutoring for college students.
          </p>
          <div className="flex gap-4 text-xs text-gray-500">
            <Link href="/marketplace" className="hover:text-indigo-600 transition-colors">Marketplace</Link>
            <Link href="/register" className="hover:text-indigo-600 transition-colors">Sign Up</Link>
            <Link href="/login" className="hover:text-indigo-600 transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
