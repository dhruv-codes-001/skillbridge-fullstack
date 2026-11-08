from datetime import datetime
from typing import Optional
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="check_valid_rating"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sessions.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    learner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    tutor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    session: Mapped["Session"] = relationship("Session", back_populates="review")
    learner: Mapped["User"] = relationship(
        "User", foreign_keys=[learner_id], back_populates="learner_reviews"
    )
    tutor: Mapped["User"] = relationship(
        "User", foreign_keys=[tutor_id], back_populates="tutor_reviews"
    )

    def __repr__(self) -> str:
        return f"<Review id={self.id} session_id={self.session_id} rating={self.rating}>"
