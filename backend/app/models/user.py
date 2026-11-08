from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="learner", index=True, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Extended college profile attributes
    college: Mapped[Optional[str]] = mapped_column(String(150), index=True, nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(150), index=True, nullable=True)
    year_of_study: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    learning_interests: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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
    tutor_profile: Mapped[Optional["TutorProfile"]] = relationship(
        "TutorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    offerings: Mapped[List["Offering"]] = relationship(
        "Offering", back_populates="tutor", cascade="all, delete-orphan"
    )
    learner_sessions: Mapped[List["Session"]] = relationship(
        "Session",
        foreign_keys="[Session.learner_id]",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    tutor_sessions: Mapped[List["Session"]] = relationship(
        "Session",
        foreign_keys="[Session.tutor_id]",
        back_populates="tutor",
        cascade="all, delete-orphan",
    )
    learner_reviews: Mapped[List["Review"]] = relationship(
        "Review",
        foreign_keys="[Review.learner_id]",
        back_populates="learner",
        cascade="all, delete-orphan",
    )
    tutor_reviews: Mapped[List["Review"]] = relationship(
        "Review",
        foreign_keys="[Review.tutor_id]",
        back_populates="tutor",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email='{self.email}' role='{self.role}'>"
