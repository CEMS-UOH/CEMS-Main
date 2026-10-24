"""SCEMS analytics service (Role 6 - Data Analytics), FR-20.

Internal only: reachable from the backend, never from the browser (docker-compose binds it
to 127.0.0.1). The backend computes the descriptive numbers itself and calls this service for
the one thing that needs a model - expected attendance of upcoming events. See README.md.

Responses use the same envelope as the backend: {"success": true, "data": ...} or
{"success": false, "error": {"message", "code"}}.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .model import predict

app = FastAPI(title="SCEMS Analytics", version="1.0.0")


class PastEvent(BaseModel):
    eventId: str
    category: str
    capacity: int = Field(ge=1)
    weekday: int = Field(ge=0, le=6)
    hour: int = Field(ge=0, le=23)
    durationHours: float = Field(ge=0)
    leadDays: float = Field(ge=0)
    bookings: int = Field(ge=0)
    checkIns: int = Field(ge=0)


class UpcomingEvent(BaseModel):
    eventId: str
    category: str
    capacity: int = Field(ge=1)
    weekday: int = Field(ge=0, le=6)
    hour: int = Field(ge=0, le=23)
    durationHours: float = Field(ge=0)
    leadDays: float = Field(ge=0)
    bookings: int = Field(ge=0)


class PredictionRequest(BaseModel):
    history: list[PastEvent] = Field(max_length=5000)
    upcoming: list[UpcomingEvent] = Field(max_length=500)


@app.exception_handler(RequestValidationError)
async def invalid_request(_request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"success": False, "error": {"message": str(exc.errors()[:3]), "code": "INVALID_INPUT"}},
    )


@app.get("/health")
def health():
    return {"success": True, "data": {"status": "up"}}


@app.post("/predict-attendance")
def predict_attendance(body: PredictionRequest):
    result = predict(
        [event.model_dump() for event in body.history],
        [event.model_dump() for event in body.upcoming],
    )
    return {"success": True, "data": result}
