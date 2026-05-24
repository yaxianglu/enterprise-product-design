from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import init_db
from app.api.design import router as design_router
from app.api.auth import router as auth_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    lifespan=lifespan,title="Enterprise Product Design Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3014", "http://localhost:3010", "https://productDesign.luyaxiang.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(design_router, prefix="/api/v1")




@app.get("/health")
def health():
    return {"status": "ok", "service": "enterprise-product-design-agent"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)
