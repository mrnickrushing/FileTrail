# Operational notes for Claude

## Standing directive: exhaust every avenue before asking the user to act

Default to doing it yourself. Before telling the user "you need to do X" or
"I can't access Y," actually try — don't assume a system is inaccessible
because the obvious first call fails. This session, every one of the
following looked like a dead end on the first attempt and wasn't:

- Codemagic's `GET /apps` 500s for this account — the fix wasn't "ask the
  user for the app ID," it was finding `GET /user` → `teams[].applicationIds`
  → per-ID `GET /apps/{id}`.
- Verifying which RevenueCat API key actually shipped in a build wasn't
  "ask the user to check" — it was downloading the built `.ipa` from
  Codemagic's artifact URL, unzipping it, and grepping `main.jsbundle`
  directly for the compiled-in key.
- Updating a wrong Codemagic environment variable wasn't "tell the user to
  edit it in the dashboard" — the documented `api.codemagic.io` v1 API
  doesn't expose variable-group management, but `codemagic.io/api/v3`
  (found via `/api/v3/schema` → `/api/v3/schema/openapi.json`) does:
  `GET /api/v3/teams/{team_id}/variable-groups`, then
  `.../variable-groups/{id}/variables`, then
  `PATCH .../variables/{variable_id}` with `{"value": "..."}`.

The pattern: if a documented/obvious endpoint fails or doesn't exist, look
for (a) an alternate endpoint that reaches the same data, (b) a newer/older
API version, (c) a way to inspect the actual artifact/output directly
instead of asking someone to eyeball a dashboard, before concluding an
action requires the user. Only hand something back to the user when there
is a real, confirmed hard blocker — a credential you don't have and can't
derive, an action that requires their explicit authorization (destructive,
financial, or account-security consequences), or a physical-world step
(installing a build on their device, checking their email).

## Codemagic API access

`GET https://api.codemagic.io/apps` (the app-listing endpoint) returns a
server-side `500 {"error":"UNKNOWN_ERROR"}` for this account, regardless of
query params, headers, or HTTP version. This is a Codemagic-side bug, not a
usage mistake — confirmed against the official docs
(https://docs.codemagic.io/rest-api/applications/) and the token authenticates
fine on other endpoints.

**Workaround — do not report this as "no access," use this path instead:**

1. `GET /user` with header `x-auth-token: <token>` — returns the account's
   teams, each with an `applicationIds` array. This endpoint works fine.
2. `GET /apps/{id}` (singular, not the list) for each ID — also works fine.
   Match on `application.repository.htmlUrl` / `appName` to find the app you
   want.
3. FileTrail's Codemagic app ID is **`6a20924e6e6d122f39b6a027`**, listed
   under Codemagic as **"Papertrail"** (legacy pre-rename name — repo URL on
   record is `github.com/mrnickrushing/Papertrail`, which redirects to the
   current `mrnickrushing/FileTrail`, same repo).
4. To trigger a build: `POST /builds` with
   `{"appId": "6a20924e6e6d122f39b6a027", "workflowId": "<yaml-key>", "branch": "main"}`.
   `workflowId` must be the literal key from `codemagic.yaml` (e.g.
   `ios-testflight`, `ota-update`) — **not** the UUID-like ID returned by the
   `workflowIds` field on the app record, which is a stale pre-YAML default
   that can't actually be used to trigger a build (see
   https://github.com/orgs/codemagic-ci-cd/discussions/1252).

The API token itself is provided by the user in-session and must never be
committed to this repo or any file here — only the app ID and this procedure
are safe to persist.

## App Store Connect API access

App Store Connect API access uses a `.p8` private key (ES256) + Key ID +
Issuer ID, provided by the user in-session — build a JWT
(`iss`=Issuer ID, `kid`=Key ID, `aud`=`appstoreconnect-v1`, 20 min max exp)
and call `api.appstoreconnect.apple.com` directly with `curl` (proxy CA at
`/root/.ccr/ca-bundle.crt`, needed for `--cacert`). FileTrail's app ID is
`6776393048` (bundle `com.papertraill.app`). Same rule: never persist the key
or generated tokens in this repo.

## Lessons from automated review (CodeRabbit / Codex / Advanced Security)

Real findings from PRs #178-184, converted into rules to apply *before*
pushing, not after a bot catches it:

1. **Never log "keys only" from a KEY=value file with `grep -o '^[^=]*=.'`.**
   The trailing `.` matches one extra character past `=`, leaking the first
   character of every secret into CI logs. Use `cut -d= -f1` instead. (Found
   independently by both CodeRabbit and Codex in #180 — it was copy-pasted
   into a second workflow before being caught, so check *every* occurrence
   of a pattern once one is flagged, not just the reported line.)

2. **When distinguishing "the backend returned an error" from "the request
   itself never completed" (offline/timeout/DNS/abort), never branch on
   `err instanceof Error`.** `fetch`/`AbortController` rejections are `Error`
   instances too. Use a dedicated subclass (e.g. `BackendHttpError`) thrown
   only from the `!res.ok` branch, and match on that specific type — anything
   else falls back to a generic, user-safe message. (Codex, #183 → #184: the
   first fix correctly surfaced real backend errors but also leaked raw
   `"Network request failed"`-style strings for genuine outages.)

3. **A recursive directory walker (`fs.readdirSync` + `path.join(dir,
   entry.name)`) will trip Semgrep's path-traversal rule as a false
   positive**, even though `entry.name` can only ever be a real filesystem
   entry under a hardcoded root, never external input. Add a justified
   `nosemgrep: <rule-id>` comment when writing one, rather than waiting for
   CI to flag it. (Advanced Security / Semgrep OSS, #181.)

4. **After any copy/pricing/entitlement change, grep the *whole* repo for
   the old claim before calling it done — not just the file(s) you set out
   to change.** This session's CodeRabbit findings (stale "$4.99/mo" in
   Settings, a "25 free documents" FAQ answer, a "0 accounts needed" hero
   stat contradicting an updated privacy badge, a Privacy Policy still
   claiming "we collect nothing" after Section 5 already disclosed
   analytics, a ToS saying "we charge you" when Apple/Google actually bill
   the customer) all came from touching one surface and missing a sibling:
   duplicate content living in both `web/marketing` and the
   `artifacts/marketing` mockup, or a mobile screen vs. its web equivalent.
   Search for the exact old string across the repo, not just the directory
   you're already in.

5. **Keep intentionally-duplicated content (the two ToS/Privacy copies)
   byte-identical in wording when you edit one** — CodeRabbit diffed them
   against each other and flagged drift (missing partial-month refund
   clause, differing currency note) that a same-file reviewer would never
   catch.
