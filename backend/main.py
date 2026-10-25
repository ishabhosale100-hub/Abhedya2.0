import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import comparison, comments, casting

app = FastAPI(
    title="ABHEDYA API",
    description="Digital Safety & Forensic Preservations Backend API",
    version="2.0.0"
)

# CORS configuration allowing frontend development port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Feature Routers
app.include_router(comparison.router)
app.include_router(comments.router)
app.include_router(casting.router)

@app.get("/")
async def root():
    return {
        "app": "ABHEDYA",
        "tagline": "Protect. Prove. Prevail.",
        "status": "operational",
        "privacy": "Zero-retention in-memory processing active."
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "photo_comparison": "ready",
            "comment_safety": "ready",
            "casting_shield": "ready"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
