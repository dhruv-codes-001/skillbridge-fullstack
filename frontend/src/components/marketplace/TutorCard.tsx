import Link from "next/link";
import { MapPin, GraduationCap, BookOpen, Clock } from "lucide-react";
import { StarRating } from "@/components/common/StarRating";
import { Badge } from "@/components/common/Badge";
import { formatCurrency, formatRating } from "@/lib/utils";
import type { TutorMarketplaceCard } from "@/types";

interface TutorCardProps {
  tutor: TutorMarketplaceCard;
}

function AvatarFallback({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sizeMap = { sm: "h-10 w-10 text-sm", md: "h-14 w-14 text-lg", lg: "h-20 w-20 text-2xl" };
  return (
    <div className={`${sizeMap[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold`}>
      {initials}
    </div>
  );
}

function SubjectChips({ subjects, max = 3 }: { subjects: string; max?: number }) {
  const chips = subjects.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  const shown = chips.slice(0, max);
  const remaining = chips.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((s) => (
        <Badge key={s} variant="indigo" size="sm">{s}</Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="gray" size="sm">+{remaining} more</Badge>
      )}
    </div>
  );
}

export function TutorCard({ tutor }: TutorCardProps) {
  const rating = typeof tutor.average_rating === "string" ? parseFloat(tutor.average_rating) : tutor.average_rating ?? 0;
  const hourlyRate = formatCurrency(tutor.hourly_rate);

  return (
    <div className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-200">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0">
          {tutor.avatar_url ? (
            <img
              src={tutor.avatar_url}
              alt={tutor.full_name}
              className="h-14 w-14 rounded-full object-cover border-2 border-indigo-100"
            />
          ) : (
            <AvatarFallback name={tutor.full_name} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
            {tutor.full_name}
          </h3>
          {tutor.college && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{tutor.college}</span>
            </div>
          )}
          {tutor.department && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <GraduationCap className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{tutor.department}</span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="text-base font-bold text-indigo-700">{hourlyRate}</span>
          <div className="text-xs text-gray-400">per hour</div>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2 mb-3">
        <StarRating rating={rating} size="sm" />
        <span className="text-sm font-semibold text-gray-800">{formatRating(rating)}</span>
        <span className="text-xs text-gray-400">
          ({tutor.total_reviews} review{tutor.total_reviews !== 1 ? "s" : ""})
        </span>
      </div>

      {/* Bio */}
      {tutor.bio && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{tutor.bio}</p>
      )}

      {/* Subjects */}
      {tutor.teaching_subjects && (
        <div className="mb-4">
          <SubjectChips subjects={tutor.teaching_subjects} />
        </div>
      )}

      {/* Stats */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
          {tutor.active_offerings_count} offering{tutor.active_offerings_count !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-indigo-400" />
          {tutor.total_sessions_completed} session{tutor.total_sessions_completed !== 1 ? "s" : ""} completed
        </div>
      </div>

      {/* CTA */}
      <Link
        href={`/tutors/${tutor.id}`}
        className="mt-4 block w-full rounded-lg bg-indigo-600 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
      >
        View Profile
      </Link>
    </div>
  );
}
