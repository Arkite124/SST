from fastapi import APIRouter

from app.routes.admin.user_management import router as user_management
from app.routes.admin.admin_posts_management import router as admin_posts_management
from app.routes.admin.admin_dashboard import router as admin_dashboard

admin_router=APIRouter()
admin_router.include_router(admin_dashboard)
admin_router.include_router(admin_posts_management)
admin_router.include_router(user_management)