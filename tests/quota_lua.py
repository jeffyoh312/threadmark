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
        return [f"user:{uid}:minute", f"user:{uid}:day", "site:day", f"user:{uid}:lock", "disabled", f"blocked:{uid}", "site:active"]

    def reserve(self, uid, limits=(2, 5, 20), concurrent=100):
        return self.redis.eval(SCRIPTS["RESERVE_QUOTA"], 7, *self.keys(uid), *limits, uid, concurrent)

    def release(self, uid, lease=None):
        return self.redis.eval(SCRIPTS["RELEASE_QUOTA"], 2, self.keys(uid)[3], "site:active", lease or uid)

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

    def test_site_concurrency_and_expired_lease(self):
        self.assertEqual(self.reserve("a", concurrent=1)[0], 1)
        self.assertEqual(self.reserve("b", concurrent=1)[1], "site_busy")
        self.assertIsNone(self.redis.hget("user:b:day", "count"))
        self.release("a", "wrong")
        self.assertEqual(self.reserve("b", concurrent=1)[1], "site_busy")
        self.redis.zadd("site:active", {"a": 0})
        self.assertEqual(self.reserve("b", concurrent=1)[0], 1)
        self.release("a")
        self.assertEqual(self.redis.zcard("site:active"), 1)
        self.release("b")
        self.assertEqual(self.redis.zcard("site:active"), 0)

    def test_visitor_ingress_does_not_exhaust_global_limit(self):
        def ingress(visitor):
            return self.redis.eval(SCRIPTS["INGRESS_QUOTA"], 3, "ingress", "disabled", visitor, 120, 2)
        self.assertEqual(ingress("a")[0], 1)
        self.assertEqual(ingress("a")[0], 1)
        self.assertEqual(ingress("a")[0], 0)
        self.assertEqual(ingress("b")[0], 1)
        self.assertEqual(int(self.redis.hget("ingress", "count")), 3)

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
            return self.redis.eval(SCRIPTS["INGRESS_QUOTA"], 3, "ingress", "disabled", "visitor:ingress", 2, 10)
        self.assertEqual(ingress()[0], 1)
        self.assertEqual(ingress()[0], 1)
        self.assertEqual(ingress()[0], 0)
        self.assertLessEqual(self.redis.ttl("ingress"), 120)
        self.redis.set("disabled", 1)
        self.assertEqual(ingress()[0], -1)

if __name__ == "__main__":
    unittest.main(verbosity=2)
