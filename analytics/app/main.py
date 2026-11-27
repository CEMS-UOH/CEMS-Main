"""SCEMS analytics service (Role 6 - Data Analytics), FR-20.

Only the backend calls it, never the browser. On a private network (docker compose binds it to
127.0.0.1) it needs no secret; when it is reachable from the internet (a free Render service),
set ANALYTICS_TOKEN here and in the backend. The backend computes the descriptive numbers itself and calls this service for
the one thing that needs a model - expected attendance of upcoming events. See README.md.

Responses use the same envelope as the backend: {"success": true, "data": ...} or
{"success": false, "error": {"message", "code"}}.
"""

import hmac
import os

from fastapi import FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .model import predict

app = FastAPI(title="SCEMS Analytics", version="1.0.0")

# Shared secret with the backend (ANALYTICS_TOKEN in both). When the service is reachable from
# the internet (e.g. a free Render service) this keeps strangers from using it. Empty = no check,
# which is fine on a private network (docker compose) or a laptop.
ANALYTICS_TOKEN = os.environ.get("ANALYTICS_TOKEN", "")


def _authorized(token: str | None) -> bool:
    if not ANALYTICS_TOKEN:
        return True
    return token is not None and hmac.compare_digest(token, ANALYTICS_TOKEN)


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
def predict_attendance(body: PredictionRequest, x_analytics_token: str | None = Header(default=None)):
    if not _authorized(x_analytics_token):
        return JSONResponse(
            status_code=401,
            content={"success": False, "error": {"message": "Missing or wrong token", "code": "UNAUTHORIZED"}},
        )
    result = predict(
        [event.model_dump() for event in body.history],
        [event.model_dump() for event in body.upcoming],
    )
    return {"success": True, "data": result}
