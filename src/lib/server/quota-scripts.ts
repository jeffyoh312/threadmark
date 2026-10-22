// One atomic reservation covers all counters and the per-user lease.
// Redis TIME keeps daily windows consistent across regions (UTC midnight).
export const RESERVE_QUOTA = `
if redis.call('GET', KEYS[5]) == '1' then return {0, 'disabled', 60} end
if redis.call('GET', KEYS[6]) == '1' then return {0, 'blocked', 60} end
local now = tonumber(redis.call('TIME')[1])
local windows = {60, 86400, 86400}
local names = {'minute', 'user_day', 'site_day'}
local counts = {}
for i = 1, 3 do
  local bucket = math.floor(now / windows[i])
  local stored = redis.call('HMGET', KEYS[i], 'bucket', 'count')
  counts[i] = 0
  if tonumber(stored[1]) == bucket then counts[i] = tonumber(stored[2]) or 0 end
  if counts[i] >= tonumber(ARGV[i]) then
    return {0, names[i], windows[i] - (now % windows[i])}
  end
end
if redis.call('EXISTS', KEYS[4]) == 1 then return {0, 'busy', 10} end
redis.call('SET', KEYS[4], ARGV[4], 'EX', 120)
for i = 1, 3 do
  redis.call('HSET', KEYS[i], 'bucket', math.floor(now / windows[i]), 'count', counts[i] + 1)
  redis.call('EXPIRE', KEYS[i], windows[i] * 2)
end
return {1, 'ok', 0}
`;

export const RELEASE_QUOTA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
`;

// Reject excess requests before authentication and bot-verification network calls.
export const INGRESS_QUOTA = `
if redis.call('GET', KEYS[2]) == '1' then return {-1, 60} end
local now = tonumber(redis.call('TIME')[1])
local bucket = math.floor(now / 60)
local stored = redis.call('HMGET', KEYS[1], 'bucket', 'count')
local count = 0
if tonumber(stored[1]) == bucket then count = tonumber(stored[2]) or 0 end
if count >= tonumber(ARGV[1]) then return {0, 60 - (now % 60)} end
redis.call('HSET', KEYS[1], 'bucket', bucket, 'count', count + 1)
redis.call('EXPIRE', KEYS[1], 120)
return {1, 0}
`;
