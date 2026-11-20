"""The shared-token check of the HTTP service. Standard library only."""

import unittest

from app import main


class TokenTests(unittest.TestCase):
    def tearDown(self):
        main.ANALYTICS_TOKEN = ""

    def test_no_token_configured_means_open(self):
        main.ANALYTICS_TOKEN = ""
        self.assertTrue(main._authorized(None))

    def test_configured_token_must_match(self):
        main.ANALYTICS_TOKEN = "s3cret-value"
        self.assertTrue(main._authorized("s3cret-value"))
        self.assertFalse(main._authorized("wrong"))
        self.assertFalse(main._authorized(None))


if __name__ == "__main__":
    unittest.main()
