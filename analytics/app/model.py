"""Attendance prediction for upcoming events (FR-20). OWNER: Role 6.

The backend sends two lists of plain numbers - past events and upcoming events - and gets back,
for each upcoming event, how many seats it is expected to fill and how many people are
expected to actually come. No names, emails or titles ever reach this service.

How it works:
1. Demand. Each past event's *fill rate* (confirmed bookings / capacity) is what we learn.
   - With enough history (MIN_EVENTS_FOR_MODEL past events) a random forest learns it from
     the category, capacity, weekday, hour, length and how early the event was announced.
   - With less, the honest answer is a baseline: the average fill rate of past events in the
     same category, else of all past events, else DEFAULT_FILL_RATE.
   The prediction is never below the bookings an upcoming event already has, and never above
   its capacity.
2. Show-up. Of the confirmed seats at past events where check-in was used (at least one
   person was scanned in), the share that were checked in. DEFAULT_SHOW_UP_RATE until there
   is such an event. Expected attendance = expected bookings x show-up rate.
"""

from __future__ import annotations

import math

import pandas as pd
from sklearn.ensemble import RandomForestRegressor

MIN_EVENTS_FOR_MODEL = 12
DEFAULT_FILL_RATE = 0.5
DEFAULT_SHOW_UP_RATE = 0.8
NUMERIC = ["capacity", "weekday", "hour", "durationHours", "leadDays"]


def _fill_rates(history: pd.DataFrame) -> pd.Series:
    return (history["bookings"] / history["capacity"].clip(lower=1)).clip(0, 1)


def show_up_rate(history: pd.DataFrame) -> float:
    """Share of confirmed seats that were checked in, over events where check-in was used."""
    if history.empty:
        return DEFAULT_SHOW_UP_RATE
    used = history[history["checkIns"] > 0]
    seats = used["bookings"].sum()
    if seats <= 0:
        return DEFAULT_SHOW_UP_RATE
    return float(min(1.0, used["checkIns"].sum() / seats))


def _features(frame: pd.DataFrame, categories: list[str]) -> pd.DataFrame:
    out = frame[NUMERIC].astype(float).copy()
    for name in categories:
        out[f"category={name}"] = (frame["category"] == name).astype(float)
    return out


def _baseline(history: pd.DataFrame, upcoming: pd.DataFrame) -> pd.Series:
    if history.empty:
        return pd.Series(DEFAULT_FILL_RATE, index=upcoming.index)
    rates = history.assign(rate=_fill_rates(history))
    overall = float(rates["rate"].mean())
    by_category = rates.groupby("category")["rate"].mean()
    return upcoming["category"].map(by_category).fillna(overall)


def _model(history: pd.DataFrame, upcoming: pd.DataFrame) -> pd.Series:
    categories = sorted(set(history["category"]))
    forest = RandomForestRegressor(n_estimators=200, min_samples_leaf=2, random_state=0)
    forest.fit(_features(history, categories), _fill_rates(history))
    return pd.Series(forest.predict(_features(upcoming, categories)), index=upcoming.index)


def predict(history: list[dict], upcoming: list[dict]) -> dict:
    """Expected bookings and attendance for each upcoming event."""
    if not upcoming:
        return {"method": "none", "trainedOn": len(history), "showUpRate": None, "predictions": []}

    past = pd.DataFrame(history, columns=NUMERIC + ["category", "bookings", "checkIns"])
    future = pd.DataFrame(upcoming)

    use_model = len(past) >= MIN_EVENTS_FOR_MODEL
    rates = (_model(past, future) if use_model else _baseline(past, future)).clip(0, 1)
    show_up = show_up_rate(past)

    predictions = []
    for index, event in future.iterrows():
        capacity = int(event["capacity"])
        already = int(event.get("bookings", 0) or 0)
        bookings = min(capacity, max(already, round(float(rates[index]) * capacity)))
        predictions.append(
            {
                "eventId": event["eventId"],
                "expectedBookings": int(bookings),
                "expectedAttendance": int(math.floor(bookings * show_up + 0.5)),
            }
        )

    return {
        "method": "model" if use_model else "baseline",
        "trainedOn": len(past),
        "showUpRate": round(show_up, 3),
        "predictions": predictions,
    }
