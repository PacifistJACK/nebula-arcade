from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
from supabase import create_client, Client

app = FastAPI()

# Supabase Setup
# Fixed URL derived from your connection string
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://ykenqvffnojqbykjjvja.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_ZPg7FO-1N7IHao7O4Mm3mQ_rbArOgGO")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Supabase Init Error: {e}")
    supabase = None

# Pydantic Models
class ScoreSubmit(BaseModel):
    game_id: str
    score: int
    username: str = "Anonymous"

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Nebula Arcade Backend (Supabase) Online"}

@app.get("/api/scores/{game_id}")
async def get_score(game_id: str):
    if not supabase:
        return {"highScore": 0, "username": "", "error": "Supabase not configured"}
    
    try:
        # Get highest score for this game globally (or could filter by user if we wanted per-user high score)
        # For now, let's return the GLOBAL high score and who got it
        response = supabase.table("scores").select("high_score, username").eq("game_id", game_id).order("high_score", desc=True).limit(1).execute()
        
        if response.data and len(response.data) > 0:
            return {"highScore": response.data[0]['high_score'], "username": response.data[0]['username']}
        return {"highScore": 0, "username": ""}
    except Exception as e:
        print(f"Supabase Fetch Error: {e}")
        return {"highScore": 0, "username": ""}

@app.post("/api/scores")
async def submit_score(score_data: ScoreSubmit):
    if not supabase:
        return {"newRecord": False, "error": "Supabase not configured"}

    try:
        # We want to store one high score per USER per GAME ideally, but the prompt implies
        # just "how much we score is saved along with the name". 
        # For a simple high score board, we might check if this score is better than the GLOBAL high score?
        # OR we save every score?
        # Let's save a "High Score" entry for this user uniquely.
        
        # Check if THIS user has a score for THIS game
        current_data = supabase.table("scores").select("high_score").eq("game_id", score_data.game_id).eq("username", score_data.username).execute()
        
        current_user_high = 0
        if current_data.data and len(current_data.data) > 0:
            current_user_high = current_data.data[0]['high_score']
        
        if score_data.score > current_user_high:
            # Upsert using a composite key logic or just ID if we had one.
            # Supabase ID is usually auto. We'll query by game_id + username.
            # If your table has a unique constraints on (game_id, username), upsert works.
            # If not, we might create duplicates. For safety, let's just INSERT always for history, 
            # OR assume we want one record per user.
            # Simpler approach: Just insert. We can filter max later.
            
            # actually, let's keep it simple: One global table 'scores'. 
            # We will insert a new row.
             supabase.table("scores").insert({
                "game_id": score_data.game_id, 
                "high_score": score_data.score,
                "username": score_data.username
            }).execute()
             
             return {"newRecord": True, "highScore": score_data.score}
        
        return {"newRecord": False, "highScore": current_user_high}
        
    except Exception as e:
        print(f"Supabase Submit Error: {e}")
        return {"newRecord": False, "highScore": 0}

@app.get("/api/games")
async def get_games():
    return {
        "games": [
             {
                "id": "neon-snake",
                "name": "Neon Snake",
                "description": "Classic Snake with a Neon Glow",
                "thumbnail": "/assets/snake-thumb.png" 
            },
            {
                "id": "cyber-breaker",
                "name": "Cyber Breaker",
                "description": "Particle-heavy Breakout",
                "thumbnail": "/assets/breaker-thumb.png"
            },
            {
                "id": "geodash",
                "name": "Neon Dash",
                "description": "Rhythm-based Action Platformer",
                "thumbnail": "/assets/geodash-thumb.png"
            },
            {
                "id": "void-runner",
                "name": "Void Runner",
                "description": "Infinite Runner in the Void",
                "thumbnail": "/assets/runner-thumb.png"
            }
        ]
    }

if os.path.exists("../frontend/dist"):
    app.mount("/assets", StaticFiles(directory="../frontend/dist/assets"), name="assets")
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse("../frontend/dist/index.html")

@app.get("/")
async def root():
    if os.path.exists("../frontend/dist"):
        return FileResponse("../frontend/dist/index.html")
    return {"message": "Frontend not built. Run 'npm run build' in frontend/."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
