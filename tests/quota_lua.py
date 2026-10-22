"""Exercise the production Lua scripts with fakeredis's Lua engine."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import re
import unittest
import fakeredis

SOURCE = (Path(__file__).resolve().parents[1] / "src/lib/server/quota-scripts.ts").read_text()
SCRIPTS = dict(re.findall(r"export const (\w+) = `(.*?)`;", SOURCE, re.S))

class Quotas(unittest.TestCase):
    def setUp(self):
        self.redis = fakeredis.FakeRedis(decode_responses=True)

    def keys(self, uid):
        return [f"user:{uid}:minute", f"user:{uid}:day", "site:day", f"user:{uid}:lock", "disabled", f"blocked:{uid}"]

    def reserve(self, uid, limits=(2, 5, 20)):
        return self.redis.eval(SCRIPTS["RESERVE_QUOTA"], 6, *self.keys(uid), *limits, uid)

    def release(self, uid, lease=None):
        return self.redis.eval(SCRIPTS["RELEASE_QUOTA"], 1, self.keys(uid)[3], lease or uid)

    def test_lock_and_ownership(self):
        self.assertEqual(self.reserve("a")[0], 1)
        self.assertEqual(self.reserve("a")[1], "busy")
        self.assertEqual(self.release("a", "wrong"), 0)
        self.assertEqual(self.release("a"), 1)

    def test_minute_and_user_day(self):
        self.reserve("a"); self.release("a")
        self.reserve("a"); self.release("a")
        self.assertEqual(self.reserve("a")[1], "minute")
        self.reserve("b", (10, 1, 20)); self.release("b")
        self.assertEqual(self.reserve("b", (10, 1, 20))[1], "user_day")

    def test_concurrent_site_cap(self):
        with ThreadPoolExecutor(max_workers=20) as pool:
            results = list(pool.map(self.reserve, map(str, range(100))))
        self.assertEqual(sum(result[0] for result in results), 20)
        self.assertEqual(int(self.redis.hget("site:day", "count")), 20)
        self.assertTrue(all(result[0] == 1 or result[1] == "site_day" for result in results))

    def test_pause_and_block(self):
        self.redis.set("disabled", 1)
        self.assertEqual(self.reserve("a")[1], "disabled")
        self.redis.delete("disabled"); self.redis.set("blocked:a", 1)
        self.assertEqual(self.reserve("a")[1], "blocked")

    def test_expiry_and_bucket_rollover(self):
        self.reserve("a", (10, 1, 20)); self.release("a")
        self.assertGreater(self.redis.ttl("site:day"), 0)
        self.assertLessEqual(self.redis.ttl("site:day"), 172800)
        self.redis.hset(self.keys("a")[1], "bucket", 0)
        self.assertEqual(self.reserve("a", (10, 1, 20))[0], 1)

    def test_ingress_ceiling_and_pause(self):
        def ingress():
            return self.redis.eval(SCRIPTS["INGRESS_QUOTA"], 2, "ingress", "disabled", 2)
        self.assertEqual(ingress()[0], 1)
        self.assertEqual(ingress()[0], 1)
        self.assertEqual(ingress()[0], 0)
        self.assertLessEqual(self.redis.ttl("ingress"), 120)
        self.redis.set("disabled", 1)
        self.assertEqual(ingress()[0], -1)

if __name__ == "__main__":
    unittest.main(verbosity=2)
