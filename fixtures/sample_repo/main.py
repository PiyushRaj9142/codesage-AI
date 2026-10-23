"""
Sample API Service Entrypoint for CodeSage Testing.
"""
from fastapi import FastAPI, Depends, HTTPException
from auth.jwt import verify_jwt_token, create_jwt_token
from services.billing import calculate_order_total

app = FastAPI(title="Sample Microservice")

@app.get("/")
def health_check():
    return {"status": "ok", "service": "sample-microservice"}

@app.post("/auth/token")
def generate_token(username: str):
    return {"token": create_jwt_token(username)}

@app.post("/orders/checkout")
def checkout(items: list, token: str = Depends(verify_jwt_token)):
    total = calculate_order_total(items)
    return {"total": total, "status": "processed"}
