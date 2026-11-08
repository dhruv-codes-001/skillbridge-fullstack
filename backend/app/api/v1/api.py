from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.offerings import router as offerings_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.tutors import router as tutors_router
from app.api.v1.users import router as users_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(tutors_router)
api_router.include_router(offerings_router)
api_router.include_router(sessions_router)
api_router.include_router(reviews_router)
api_router.include_router(notifications_router)
