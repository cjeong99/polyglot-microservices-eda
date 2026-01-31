from fastapi import FastAPI
from pydantic import BaseModel
from uuid import uuid4

app = FastAPI()

# In-memory store (we add DB later)
users = {}

class UserCreate(BaseModel):
    name: str
    email: str

@app.get("/health")
def health():
    return {"status": "user-service ok"}

@app.post("/users")
def create_user(user: UserCreate):
    user_id = str(uuid4())
    users[user_id] = user.dict()
    return {"userId": user_id, **user.dict()}

@app.get("/users/{user_id}")
def get_user(user_id: str):
    if user_id not in users:
        return {"error": "User not found"}
    return {"userId": user_id, **users[user_id]}
