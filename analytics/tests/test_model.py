"""Tests for the attendance model. Standard library only: python -m unittest (from analytics/)."""

import random
import unittest

from app.model import DEFAULT_FILL_RATE, DEFAULT_SHOW_UP_RATE, MIN_EVENTS_FOR_MODEL, predict


def event(event_id, category="Workshop", capacity=100, bookings=0, check_ins=0, hour=18, weekday=2):
    return {
        "eventId": event_id,
        "category": category,
        "capacity": capacity,
        "weekday": weekday,
        "hour": hour,
        "durationHours": 2.0,
        "leadDays": 10.0,
        "bookings": bookings,
        "checkIns": check_ins,
    }


class BaselineTests(unittest.TestCase):
    def test_no_history_uses_the_defaults(self):
        result = predict([], [event("u1", capacity=200)])
        self.assertEqual(result["method"], "baseline")
        self.assertEqual(result["trainedOn"], 0)
        p = result["predictions"][0]
        self.assertEqual(p["expectedBookings"], int(200 * DEFAULT_FILL_RATE))
        self.assertEqual(p["expectedAttendance"], round(200 * DEFAULT_FILL_RATE * DEFAULT_SHOW_UP_RATE))

    def test_same_category_average_is_used_first(self):
        history = [
            event("p1", "Workshop", 100, bookings=90, check_ins=72),
            event("p2", "Workshop", 100, bookings=70, check_ins=56),
            event("p3", "Sports", 100, bookings=10),
        ]
        result = predict(history, [event("u1", "Workshop", 50), event("u2", "Seminar", 100)])
        workshop, seminar = result["predictions"]
        self.assertEqual(workshop["expectedBookings"], 40)  # 80% of 50
        # No Seminar history: the average of all past events, (0.9 + 0.7 + 0.1) / 3.
        self.assertEqual(seminar["expectedBookings"], 57)
        # Show-up only counts events where check-in was used: (72 + 56) / (90 + 70) = 0.8.
        self.assertAlmostEqual(result["showUpRate"], 0.8)
        self.assertEqual(workshop["expectedAttendance"], 32)

    def test_never_below_current_bookings_nor_above_capacity(self):
        history = [event("p1", bookings=10)]
        result = predict(history, [event("u1", capacity=100, bookings=60), event("u2", capacity=20)])
        self.assertEqual(result["predictions"][0]["expectedBookings"], 60)
        self.assertLessEqual(result["predictions"][1]["expectedBookings"], 20)

    def test_nothing_upcoming(self):
        self.assertEqual(predict([event("p1")], [])["predictions"], [])


class ModelTests(unittest.TestCase):
    def test_learns_that_evening_events_fill_up(self):
        rng = random.Random(1)
        history = []
        for i in range(MIN_EVENTS_FOR_MODEL * 3):
            evening = i % 2 == 0
            fill = (0.9 if evening else 0.2) + rng.uniform(-0.05, 0.05)
            history.append(event(f"p{i}", capacity=100, bookings=round(fill * 100), hour=19 if evening else 8))
        result = predict(history, [event("evening", hour=19), event("morning", hour=8)])
        self.assertEqual(result["method"], "model")
        evening, morning = result["predictions"]
        self.assertGreater(evening["expectedBookings"], 75)
        self.assertLess(morning["expectedBookings"], 35)


if __name__ == "__main__":
    unittest.main()
