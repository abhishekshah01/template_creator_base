"""Template Creator API — backend entry point.

Run: cd backend && uvicorn main:app --reload --port 8000

Routes live in routers/, business logic in services/, external HTTP wrappers in
clients/, pydantic models in schemas/.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import admin_auth, asset, category_config, env, job, template

app = FastAPI(title="template-automation-v0")

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
