"""Template Creator API — backend entry point.

Run: cd backend && uvicorn main:app --reload --port 8000

Routes live in routers/, business logic in services/, external HTTP wrappers in
clients/, pydantic models in schemas/.
"""

# Load backend/.env BEFORE any module that reads os.environ at import time.
from dotenv import load_dotenv

load_dotenv()

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from clients import app_service_client, composer_client, mongo_client
from routers import admin_auth, asset, category_config, env, job, permissions as permissions_router, template
from services import admin_users
from services.permissions import seed as permissions_seed


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await mongo_client.ensure_indexes()
    await permissions_seed.seed_system_roles()
    await admin_users.ensure_rbac_fields()
    yield
    await app_service_client.aclose()
    await composer_client.aclose()
    await mongo_client.aclose()


app = FastAPI(title="template-automation-v0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"status": "ok", "service": "template-automation-v0"}


app.include_router(env.router)
app.include_router(job.router)
app.include_router(template.router)
app.include_router(category_config.router)
app.include_router(asset.router)
app.include_router(admin_auth.router)
app.include_router(permissions_router.router)
