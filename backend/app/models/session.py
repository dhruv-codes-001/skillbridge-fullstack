from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    offering_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("offerings.id", ondelete="CASCADE"), index=True, nullable=False
    )
    learner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    tutor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    scheduled_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    scheduled_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    status: Mapped[str] = mapped_column(
        String(30), default="pending", index=True, nullable=False
    )  # "pending", "accepted", "rejected", "completed", "cancelled"
    learner_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    offering: Mapped["Offering"] = relationship("Offering", back_populates="sessions")
    learner: Mapped["User"] = relationship(
        "User", foreign_keys=[learner_id], back_populates="learner_sessions"
    )
    tutor: Mapped["User"] = relationship(
        "User", foreign_keys=[tutor_id], back_populates="tutor_sessions"
    )
    review: Mapped[Optional["Review"]] = relationship(
        "Review", back_populates="session", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Session id={self.id} status='{self.status}' start={self.scheduled_start}>"
