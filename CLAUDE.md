# Operational notes for Claude

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
