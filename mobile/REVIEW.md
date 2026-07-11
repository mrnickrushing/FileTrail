# FileTrail — Mobile App Review

**Scope:** `/mobile` folder (Expo SDK 52, React Native 0.76.9, Expo Router 4, Zustand 5)
**Reviewer focus:** UI updates, feature ideas, comprehensive bug list — with extra emphasis on **performance**.
**Mode:** Report only — no code changes were made.

> **Status note (post SDK 56 upgrade):** most of the P0 items and many P1 items below
> (salted password hashing, SecureStore migration, MMKV persistence, search indexing,
> selector-based store subscriptions, AppState lock-on-inactive, real PDF page counts,
> theme/dead-file cleanup, folder depth limit, incremental sync) have since been fixed.
> Treat this document as a historical bug list, not a current backlog — verify against
> the code before acting on any item below.

---

## Stack snapshot

| Area | Detail |
|---|---|
| Runtime | Expo SDK 52, RN 0.76.9, React 18.3.1, New Arch **off** |
| Navigation | Expo Router 4 (typed routes, file-based) |
| State | Zustand 5 + `persist` middleware → AsyncStorage |
| OCR | `react-native-text-recognition` (iOS Vision only) |
| IAP | `react-native-purchases` (RevenueCat) |
| AI | Backend `/v1/ai/suggest-document` (Claude Haiku via your Railway backend) |
| Auth | Local-only profile + Sign-in-with-Apple + optional backend `/v1/auth/register` |
| Backup | Custom `.ptbak` with **XOR obfuscation + base64** (not real encryption) |
| Icons | `@expo/vector-icons` (Feather) — heavily mixed with **emoji glyphs** for category visuals |
| Theme | Dark-only, charcoal + amber accent |

---

## 1. Bug list

Ordered by severity. P0 = critical / data-loss / security. P1 = functional. P2 = polish.

### P0 — Critical

1. **Password hashing is unsalted SHA-256** (`services/hashUtils.ts`, used in `account.tsx`).
   `Crypto.digestStringAsync(SHA256, password)` → same input always yields the same hash. No salt, no work factor, no constant-time compare. Anyone who dumps AsyncStorage can crack passwords via rainbow tables in seconds. Use PBKDF2/scrypt with a per-account random salt and ≥100k iterations, or `expo-secure-store` to keep only a verifier off-device.

2. **OCR queue can leave documents stuck in `'processing'` forever.**
   `ocrQueue.ts` is in-memory only. `processOCRQueue()` (called on app boot from `_layout.tsx`) only re-enqueues docs whose status is `'pending'` — `'processing'` is explicitly skipped (line 28). If the app is killed mid-OCR, those docs stay `'processing'` forever and never re-run.
   **Fix:** on boot, reset any `'processing'` doc back to `'pending'` before the queue runs.

3. **AsyncStorage stores the entire `documents` array on every mutation.**
   `documentStore.ts` `partialize` serializes the whole `documents` + `folders` array on each `set()`. With OCR text included this can be many MB; bulk operations (`bulkDelete`, `bulkSetTags`, `bulkMove`) rewrite the whole blob multiple times. On Android, AsyncStorage’s SQLite-backed writes will block the JS thread for hundreds of ms with > ~5MB of state. Recommendation: switch to `react-native-mmkv` for the documents slice or shard per-document keys, and strip `ocrText` from the persisted payload (load lazily).

4. **No re-entrancy / race protection in concurrent AI batch organize.**
   `handleBulkAiOrganize` (`(tabs)/index.tsx`) runs `Promise.allSettled(batch.map(processSingle))` 3-at-a-time. Each `processSingle` reads `useDocumentStore.getState().folders` and may *create* the same folder twice for sibling docs going into the same suggestion. Result: duplicate folders with the same name. Wrap folder lookup/creation in a serial step or a small mutex.

5. **Apple-relay email fallback is collision-prone.**
   `appleRelayFallback(credential.user)` uses only the **first 8 chars** of Apple’s opaque user ID as part of the fake email. Two Apple users could collide; the fallback also locks the user to a synthetic `@private.filetrail` address that backend matching may treat as unique. Use a SHA-256 hash of the full user ID, or store `credential.user` as the canonical identifier instead of inventing an email.

### P1 — Functional / UX bugs

6. **VaultScreen subscribes to the entire `useDocumentStore`.**
   `(tabs)/index.tsx`:
   ```ts
   const { documents, folders, isLoading, ... } = useDocumentStore();
   ```
   This re-renders the whole Vault tab on *any* store update — including unrelated tag changes for a single doc, OCR status flips, and sync writes. Combined with the `FlatList` and `SwipeableCard` (each with its own Reanimated shared values), this causes visible jank when OCR is running. **Use selectors with shallow equality** the way `folders.tsx` already does:
   ```ts
   const documents = useDocumentStore(s => s.documents);
   ```

7. **FlatList in Vault has no virtualization tuning.**
   No `removeClippedSubviews`, `windowSize`, `initialNumToRender`, `maxToRenderPerBatch`, `getItemLayout`. With 200+ docs and `SwipeableCard` (gesture + animated shared value per row), scrolling will drop frames. Each `DocumentCard` also draws shadows on every row (iOS `shadow*` props are expensive). Quick wins: `initialNumToRender={10}`, `maxToRenderPerBatch={6}`, `windowSize={9}`, `removeClippedSubviews` on Android. For the card-grid view, also consider `FlashList` (Shopify) — drop-in 3–5× perf gain.

8. **Search has no index and runs a full scan on every keystroke (debounced 150ms).**
   `documentStore.search()` loops every doc, lowercases per call, runs `indexOf` against title/category/tags/ocrText. For 1000 docs with multi-page OCR text, each keystroke can lock the JS thread for 200–500 ms. **Fix:** build an inverted index (tokenize on doc add/update, store `Map<token, Set<docId>>` in memory). Even a simple cached lowercase concatenation per doc gives a big speedup.

9. **`setTimeout(..., 0)` in search.tsx is not actually deferring work.**
   ```ts
   setTimeout(() => { const r = searchFn(q); ... }, 0)
   ```
   `setTimeout 0` does not yield to UI rendering on RN. Use `InteractionManager.runAfterInteractions` or move the search to a Web Worker (via `react-native-workers`) for real off-thread work.

10. **Pull-to-refresh does nothing meaningful.**
    `onRefresh = loadDocuments`, and `loadDocuments` is a no-op (`async () => undefined`). The spinner appears but no work happens. Either remove pull-to-refresh or wire it to `syncWithBackend()`.

11. **`enhance` button in `ImageCropper.tsx` is a placebo.**
    `applyTransforms` builds `actions` from rotation only; `newEnhanced` only nudges JPEG quality from 0.92 → 0.95. The "✨ Enhance" button visibly changes nothing — there is no contrast/grayscale/sharpen step despite the docstring saying so. Either implement (e.g. `manipulateAsync(..., [{ contrast }, { grayscale }])`-equivalent via expo-image-manipulator’s actions if/when supported, or via a small native filter pass), or remove the button.

12. **Notes input becomes uncontrolled when `document.notes` is undefined.**
    `viewer/[id].tsx`:
    ```ts
    useEffect(() => { if (!isEditingNotes && document?.notes !== undefined) setEditNotes(document.notes); }, ...);
    ```
    The state never resets to `''` when `notes` goes back to undefined (e.g. after Delete). Then `<TextInput value={editNotes}>` with `editNotes` from a previous state can desync. Replace with `setEditNotes(document?.notes ?? '')`.

13. **`pdfTotal` is frozen at mount.**
    `const [pdfTotal] = useState(document?.pageCount ?? 1);` — no setter, and `getPDFInfo()` always returns `pageCount: 1` (stub). Result: PDF page navigator is dead code and the chip in metadata always says “1 page”. Either implement page count via a native PDF module or hide the page UI when there's only 1 page (currently `totalPages > 1` is always false).

14. **OCR retry will try to OCR PDFs.**
    `searchScreen` exposes "Retry OCR" when `ocrStatus === 'failed'`. `retryOCR` re-enqueues regardless of mimeType. `extractText` is an image-only Vision API → it will fail again and the doc stays failed. Gate retry by `mimeType.startsWith('image/')`.

15. **Folder navigation drops below 2 levels deep.**
    In `(tabs)/folders.tsx` the activeFolder view computes:
    ```ts
    const subfolders = isSubfolder ? [] : folders.filter(f => f.parentId === activeFolder.id);
    ```
    A sub-folder cannot show its own children — deep hierarchies (level 3+) become invisible. Either remove the `isSubfolder ? [] :` clause or document that only one level of nesting is supported (which the AI suggestion endpoint also explicitly returns: parent + optional subfolder only).

16. **Folder picker for sub-folders is missing.**
    `FolderPickerModal` flattens all folders into a single list with no parent grouping/indent. Picking "Subfolder A" and "Subfolder A" under a different parent is indistinguishable.

17. **`StatusBar` style is wrong in light mode.**
    `_layout.tsx`: `<StatusBar style={colorScheme === 'light' ? 'dark' : 'light'} />`. App background is always dark `C.ink1` regardless of system theme — when the system is set to light, status bar text is `dark` on a dark surface → invisible. Force `style="light"`.

18. **AppState lock triggers on `inactive` (e.g. brief Control Centre, app switcher).**
    `_layout.tsx` locks when transitioning to `background` **or** `inactive`. iOS fires `inactive` for any short interruption (incoming call banner, Siri, app switcher preview). Users get locked out for trivial events. Only lock on `background`.

19. **`viewer/[id]` PDF inferredDate label uses double `toLocaleDateString` workaround.**
    ```ts
    new Date(document.inferredDate).toLocaleDateString(...).replace(/Invalid Date/, document.inferredDate)
    ```
    Works but brittle. Parse the date first; show the raw string only if parsing fails.

20. **Sync pushes the entire document list every cycle.**
    `syncMetadata` POSTs the **whole** documents/folders array on each app open (`syncWithBackend` in `_layout.tsx`). No `lastUpdatedAt` cursor, no diff. With 500 docs this is megabytes per sync; over LTE it’s slow and burns battery. Add a `sinceUpdatedAt` filter on push.

21. **No retry/backoff for failed sync.**
    `syncWithBackend` is silent on failure. Tombstones don’t leave the device until a *full* successful round trip. Persistent server failure would let the deletes pile up unbounded. Add a max-cycle reset or surface a retry banner.

22. **Auto-OCR + AI in `capture/review.tsx` runs duplicate base64 reads.**
    `FileSystem.readAsStringAsync(uri, base64)` is called twice in some branches (PDF + image vision). For a 4MB file that’s 50–150 ms each on iPhone 13. Cache the read once per render.

23. **`useDocumentStore` mixed import paths.**
    Some files import from `@/store` (which doesn’t export `useProStore`), others from `@/store/documentStore`, others from `@/store/proStore`. `/store/index.ts` only re-exports `useDocumentStore` and `useAppStore`. Easy to import from the wrong path and get a stale module copy on Metro fast-refresh. Centralise the barrel.

24. **`document.fileSizeBytes ?? 0` lets unknown-size files bypass the 4MB AI base64 limit.**
    Photo picker often returns `size: 0` (it does in this codebase — `useDocumentPicker.ts` line 80). The guard `(doc.fileSizeBytes ?? 0) <= 4MB` therefore allows 30MB photos through. Read `FileSystem.getInfoAsync(uri).size` before base64-encoding.

25. **Empty state icon prop falls through to a non-existent Feather icon for some callers.**
    `EmptyState.tsx`:
    ```ts
    const ICON_MAP = { 'file-text', 'folder', 'search' };
    <Feather name={ICON_MAP[icon] ?? 'file'} />
    ```
    Search screen passes `icon="search"` → OK. But `inbox` (used in folders.tsx for unfiled) routes through the same prop in other places and would fall through to `'file'`. Feather's `'file'` does exist but it isn’t the design intent. Extend the map.

26. **`Pressable` selection toggle doesn't disable swipe in select mode reliably.**
    `SwipeableCard` is given `disabled={selectionMode}`, but **the disabled state is captured at gesture-detector construction time only** because `Gesture.Pan().enabled(!disabled)` is created once per render via the closure — RNGH v2 handles updates via the gesture builder, so this is mostly fine, but the gesture handler still mounts. Marginal.

27. **Account screen Sign-Out colour is amber (the primary action colour).**
    Visually competes with “Unlock Pro” and the FAB. Should be a secondary/neutral tone; only “Delete Account” should read as destructive.

28. **`useAppStore.isPro` is dead duplicate state.**
    `appStore.ts` defines `isPro` *and* `setIsPro`. Nothing in the app ever reads or writes them — Pro state lives in `proStore.ts`. Cross-cutting confusion; remove from `appStore`.

29. **`(tabs)/_layout.tsx` defines its own `TabIcon` that shadows `components/TabIcon.tsx`.**
    Two diverging implementations: 18 px vs 22 px, different "focused" treatment. Pick one.

30. **Theme duplication.**
    - `/theme/colors.ts` exports `Colors` with a *different* palette from `/theme/tokens.ts` and is **not** re-exported through `theme/index.ts`. It is orphan.
    - `/theme/typography.ts` exports `T` with **different sizes** (`lg: 20` vs tokens.ts `lg: 18`).
    - `/theme/spacing.ts` is a near-duplicate of the spacing block in `tokens.ts`.
    If any new file imports from `theme/typography` instead of `theme/tokens`, fonts drift. Consolidate or delete the unused files.

31. **Dead route screens.**
    - `app/document/[id].tsx` is registered in the root `Stack` but no navigation pushes there. The Vault and Folders screens use `/viewer/${id}`. Confusing to maintain.
    - `app/folder/[id].tsx` is also registered but never linked — `folders.tsx` uses inline `activeFolder` state instead.

32. **`pdfThumbnail.ts` is dead and broken.**
    Tries to render a PDF by embedding it in HTML inside `expo-print` and then running `ImageManipulator` on the resulting PDF output, which always throws and returns `null`. Not called from anywhere. Either implement properly with a native PDF renderer (e.g. `react-native-pdf-thumbnail` in an EAS build) or delete the file.

33. **`getPDFInfo` always returns `pageCount: 1`** (stub by design). Combined with bug #13 above, this caps every PDF at 1 visible page in metadata chips.

34. **`processOCRQueue` calls `enqueueOCR(doc.id, doc.fileUri)` for *all* pending docs on cold start.**
    Including PDFs (because nothing checks mime here). PDFs added before the “image only” gate was introduced (`addDocument`) will be queued and silently fail. Add the mime guard inside `enqueueOCR` too.

35. **No analytics consent gate / GDPR posture.**
    `analytics.ts` is a stub but is wired to a backend endpoint. `enableAnalytics` is **never** called anywhere in the app, so events silently never fire (good for privacy, bad if you intended to measure). If you ever turn it on, you’ll need a consent screen.

36. **`accountProfile.passwordHash` is persisted in plaintext in AsyncStorage** (along with the SHA-256 hash mentioned in P0). On a jailbroken device an attacker reads it directly. Move credentials to `expo-secure-store` (Keychain / Keystore).

37. **No keyboard handling for the tag editor when many tags overflow horizontally.**
    `TagEditor` uses a horizontal `ScrollView` for active tags; long tags + a keyboard up + iOS small phone results in the suggestion area being unreachable. Convert tag list to a `flexWrap: 'wrap'` layout or shrink the input.

38. **`exportAllAsZip` reads every file as base64 into RAM, builds the JSZip object in memory, then re-encodes the entire archive as base64.**
    Peak memory ≈ 3× total file size. The 100 MB warn threshold protects against the worst case, but iPhones on 3GB RAM will OOM at much lower sizes (~50–60 MB total). Stream into the zip via `jszip` `nodebuffer` is not feasible on RN, but you can at least chunk by 10 files and reuse a single base64-decoder. Or move ZIPing to the backend.

39. **Backup file format is reversible without any secret.**
    `xorBase64(json, seed)` uses `seed = createdAt.slice(0, 16)` — and the seed is embedded **in the same file** (`PTBAK1:<seed>|<payload>`). Anyone can decode the backup. This is fine if you call it "obfuscated", but the file extension `.ptbak` and code comments imply encryption. Either implement real AES-GCM with a user passphrase (Pro feature), or rename and stop suggesting it's secure.

40. **`useCamera` does not handle `permission.status === 'undetermined'` flow on subsequent denials.**
    After first denial, `requestCameraPermissionsAsync()` returns `{ granted: false, canAskAgain: false }`. The hook returns `'denied'` but the user is never directed to Settings (the `PermissionPrompt` component exists but is not wired anywhere). Add a "Open Settings" path.

41. **`onboarding.tsx` disables swiping between slides.**
    `scrollEnabled={false}` on the FlatList means the dots and Next button are the only way forward. Users who try the natural horizontal swipe gesture get no feedback. Enable swipe.

42. **Free-tier hard limit applies the *current* document count, not the post-save count, in one branch.**
    `capture/review.tsx`:
    ```ts
    if (documents.length >= FREE_DOCUMENT_LIMIT && !isPro) setShowPaywall(true);
    ```
    OK. But the rest of the codebase shows the paywall *after* the user has done all the AI/OCR/categorization work — wasting backend tokens and time before the paywall blocks the save. Show paywall at the start of `capture/review` flow when at the limit.

43. **`searchHistory` is silently capped at 12 entries with no signal in the UI.** Tiny polish.

44. **`PaywallModal` `restoreText` button accepts taps while disabled.**
    `disabled={isLoading}` but on iOS the visual feedback doesn’t change (no opacity reduce). Add `pressed`/`disabled` styles.

45. **`(tabs)/index.tsx` `bulkAiOrganize` does not show progress for items beyond batch 1.**
    The user sees "AI Organizing…" then a single completion alert. Add a progress like "Processed 6 of 24".

46. **`SwipeableCard` reset.**
    On `onFinalize` you `withSpring(0)` even after a successful favorite (which already set it to 0 instantly). For the delete path the alert can sit open while the card snaps back — confusing because the doc visually returns before the user confirms deletion. Consider only resetting after the alert is dismissed.

47. **`metro.config.js` custom `@/` resolveRequest is redundant with `babel-plugin-module-resolver`.** Both do the same job. Pick one to reduce build complexity.

48. **`tsconfig.json` strict mode is on but many places use `any` casts** (e.g. `aiPatch as any`, `recordAiUsageCost(suggestion.usage.costUsd)` with non-narrowed type). Tighten types or add `unknown` + narrowing helpers.

### P2 — Polish

49. The "AI usage" line in Settings shows raw `$0.0003` to four decimals — confusing for non-technical users. Round to cents and show "< $0.01" below threshold.
50. "Saved" pill (favorite indicator) on cards is right after the category — could be a heart/star to one side instead of a duplicate label.
51. Pull-to-refresh spinner colour uses `Colors.primary` but `tintColor` doesn't change for dark mode — fine, but inconsistent with the amber-on-dark theme.
52. Long folder names get truncated mid-character because there's no `numberOfLines={1}` on the folder row name.
53. Search "Date" sort sorts by `createdAt` not `updatedAt` — title says "Date" but the dropdown header has different field semantics from the Vault sort.
54. Capture sheet uses `router.replace` instead of `router.push` for the review screen — back swipe doesn't return to the picker.
55. The header "Sort" button cycles through 4 sort fields; the icon and label change but there's no visual "active" state to indicate which is current. Tooltip-ish indicator would help.
56. The colour swatch row in folder creation is a fixed 8-colour palette — could expose a custom picker.
57. **No haptic on save document** completion — the success path goes straight to `viewer`. A small `Haptics.notificationAsync(Success)` would feel rewarding.
58. The OCR "extracted N words" copy on the review screen lies a bit when text is empty — shows "0 words extracted" instead of "No text detected".
59. `Capture/review.tsx` AI status logic has 7 nested conditional branches in `ocrRow`. Extract to a single computed state machine for readability.
60. Settings has no clear way to wipe sync data / reset device id (e.g. for testing).

---

## 2. Performance hot-spots (consolidated)

1. **Whole-store subscription in Vault** (bug #6).
2. **Full document re-serialization to AsyncStorage on every mutation** (bug #3) — move to MMKV.
3. **Search scan is O(N·M) per keystroke** with no index (bug #8).
4. **`setTimeout(0)` doesn’t actually defer** the search heavy lifting (bug #9).
5. **FlatList not virtualization-tuned** (bug #7).
6. **`SwipeableCard` mounts gesture detector + Reanimated SharedValues per row** — fine for 50 cards, painful at 500. Consider mounting only on focus / lazy.
7. **Duplicate base64 reads in capture/review** (bug #22).
8. **Image cropper re-runs `ImageManipulator` from the original URI on every rotate/enhance** (`ImageCropper.tsx`). Cache intermediate URIs.
9. **`exportAllAsZip` memory blowup** (bug #38).
10. **Full-list sync push** (bug #20).

Lower-priority:

11. `categoryFromOCR` runs a series of regex over every doc when called from anywhere — not currently a hot path, but cache by hash.
12. `extractMetadata` uses `String.prototype.matchAll` with capture groups — fine, but lazy parse it once on OCR completion, not on every render.
13. The `(tabs)/index.tsx` filter bar runs a `Set` rebuild on every render (`allTags = useMemo`) which is correct, but the inner shadow/elevation on every chip causes re-paints when the active filter changes.
14. `appStore` partializes ~10 fields including booleans + numbers — splitting into smaller persisted slices reduces serialization size.

---

## 3. UI / UX recommendations

### Quick wins (low risk, high impact)

1. **Replace category emojis with monochrome Feather/Lucide glyphs**, keeping the coloured accent strip + tinted pill. Emojis render with the iOS / Android system emoji font and look out of place against your dark, restrained palette — they break the "secure filing cabinet" vibe stated in `theme/tokens.ts`. Reserve emojis for one or two moments (e.g. the onboarding hero icon).
2. **Tighten typography scale.** Currently three competing scales (`tokens.ts`, `typography.ts`, inline). Pick one. The Vault header at `xxl (28)` with `letterSpacing: -0.5` is good — extend that to title rows and remove the smaller `lg/xl` redundancy.
3. **Headers are inconsistent across tabs.**
   - Vault has a 2-line title block (FileTrail + doc count) with sort controls on the right.
   - Folders has a single-line title with a `+ New` button.
   - Search has a TextInput-only bar with no title.
   - Settings has a single line title.
   Standardise: one `ScreenHeader` component with title, subtitle, and an optional right slot.
4. **Floating tab bar overlaps the empty state.** The `EmptyState` is `flex: 1, justifyContent: center` so it ignores the 160px `paddingBottom` on the list. Either pad it or vertically centre minus tab-bar height.
5. **The "AI organize" button on a single doc and the "AI Organize" bulk action use different microcopy and chevrons.** Unify language.
6. **Search results group header (`Title · Tag · Category (N)`)** is unusual. Most users won’t parse "matchedFields" terminology. Rephrase as **"Direct matches"** and **"Found inside the document text"**.
7. **Document viewer header is cramped on small phones** (back arrow + truncated title + category pill + 3 icons in 44 px row). Move the category pill below the title or into the meta strip; promote share/favorite icons to a single overflow menu.
8. **Sign-Out should be neutral, not amber.** Reserve amber for primary/promotional CTAs (Pro unlock, Save, Next).
9. **Use one consistent radius.** Cards mix `R.lg (14)` and `R.xl (20)` with no clear logic. Pick `R.lg` for cards, `R.xl` for sheets.
10. **Empty Vault state** could surface a “Try with a sample document” chip — onboarding-into-action moment.
11. **PDF "preview disabled" screen** is jarring. Show a generic PDF page outline + filename + "Open in iBooks" button (`expo-sharing.shareAsync` already exists). Right now users see a stub message every time.

### Bigger UX moves

12. **Unify Document Health into the Vault header** as a small percentage ring. It currently lives only in `HealthScoreBanner` which is not wired into any screen. Show it next to the doc count.
13. **The "Saved" / favorite filter chip** says `Saved ×` when active — confusing because users think tapping × removes the filter (it does, but × is also used inside chips to remove tags). Use a checkmark or fill state instead.
14. **Sort icon-only button doesn't show direction**. Add a tiny chevron-up/down on the same control rather than two separate buttons.
15. **The category list is 17 items long.** On the review screen this is a wrap of 17 pill chips that pushes the Save button very far down. Group into "Common" (top 5–6) + "More…" sheet. Saves vertical real estate.
16. **Folder picker** should show parent → child indentation so users can place a doc into "Receipts › 2024" vs "Receipts › 2023".
17. **Move the AI Organize CTA above the metadata strip in the viewer** — it’s the highest-value action in the screen and is currently buried under chips.
18. **Surface API budget / usage friendlier**. Add a soft monthly cap warning at $1 / $5 with a progress ring under Settings.

### Visual polish

19. The amber tone is good but very saturated. On glassy iPad / iPhone displays it can flare. Consider a slight desaturation (`#D9941E` instead of `#E8A020`) or layer an `amberDim` over warm cream.
20. Card shadows are heavy (`opacity 0.28, radius 10`). On dark backgrounds this washes out the edge. Lower to `0.12 / 6` and bump the border opacity.
21. **Selection mode entry needs a haptic + visual transform.** Cards just gain a circle checkbox — a small bounce in/out would help.
22. **Header sort + view-mode buttons use the same chip style** — flatten to a segmented control or icon-only with tooltips.
23. **Custom-cursor / selection state** isn’t needed on mobile; ignore that part of any cross-platform design system.

---

## 4. Feature ideas

Ordered by ROI / fit with the existing model:

1. **Encrypted backups (real)** — promote AES-256-GCM-with-user-passphrase to a Pro feature. Backup file becomes opaque without the passphrase. The current XOR scheme is misleading.
2. **Document expiry tracking** — many of the categories (warranty, id, contract, insurance, vehicle) have natural expiry dates. Capture an `expiresOn` and surface a "Expiring in 30 days" banner in the Vault. AI can already infer dates — wire `inferredDate` + a "this looks like an expiry" question.
3. **Bills due / reminders** — pair with `expiresOn` for bills; one-tap "Add to Apple/Google Calendar".
4. **Cross-document search** with **natural language** (Pro) — "what's my electricity bill from last March?". You already have Claude integration; add a small router for ad-hoc search-style queries against the per-doc metadata + OCR.
5. **Per-folder default category & color** — when a doc is added inside a folder, autoselect its category. Saves a tap on the review screen.
6. **iOS Share Extension** — long-overdue for a document app. Users want to send a PDF from Safari/Mail straight into FileTrail without leaving the source app. Add an `EXShareExtension` target via EAS.
7. **Document linking** — "see also" relations between documents (a contract linked to its associated receipt). Even just a simple manual link list per document.
8. **Auto-rename suggestions** for legacy items — "We renamed 12 of your docs while you slept." Scheduled background AI organize for Pro users via `expo-background-task`.
9. **Multi-page scan flow** — `useCamera` captures a single photo; document apps live and die by easy multi-page capture into one PDF. Add a tray that accumulates pages, then runs `expo-print` to compose them.
10. **Apple Watch glance / Siri shortcut** — "Hey Siri, show my passport" reads from the Vault. Niche but a differentiator.
11. **Family vaults / shared folders (Pro)** — already alluded to in PaywallModal. Real impl needs server-side ACLs.
12. **Audit log** — settings page showing recent destructive actions ("Deleted 3 docs on Jan 12"), with a 14-day "trash" if the user enables it.
13. **Smart category training** — let a user accept/reject AI suggestions; feed those choices into a small local heuristic that biases category prediction.
14. **Receipt OCR → expense report export** — the `amounts` field + `vendor` + `inferredDate` already exists. Add a "Export expense CSV" button for receipts in a given date range. Could be a paid Pro feature for freelancers.
15. **Quick-pin (most accessed)** — a row above the Vault showing the 4 most-recently-opened docs.
16. **Cleaner sharing** — let user share a `signedUrl` from the backend instead of the raw file (Pro), so the share recipient sees a beautiful FileTrail landing page (referral hook).
17. **Document version history** — when a user re-scans the same doc, link them as versions.
18. **Per-doc passcode lock** — sensitive items (passport, SSN card) can require Face ID *every time*, not just app-wide lock.
19. **Apple Wallet pass for IDs** — generate a `.pkpass` for driver licence / ID cards.
20. **End-to-end encrypted cloud sync (Pro)** — the current sync sends plaintext over HTTPS; bump it to client-side AES with a derived key from a user passphrase. Massive trust signal for the privacy-first positioning.

---

## 5. Easy maintainability wins

- Delete `/theme/colors.ts`, `/theme/typography.ts`, `/theme/spacing.ts` — these are superseded by `/theme/tokens.ts`. The duplication is a footgun.
- Delete `/app/document/[id].tsx`, `/app/folder/[id].tsx`, `/components/TabBarIcon.tsx`, `/components/FolderCard.tsx`, `/components/CategoryBadge.tsx`, `/components/HealthScoreBanner.tsx` (only used internally and the Card stylings are also duplicated in `DocumentCard.tsx`). Verify before deleting — but most are orphans.
- Delete `/services/pdfThumbnail.ts` until a real implementation lands.
- Pick one of `metro.config.js` `resolveRequest` vs `babel-plugin-module-resolver`. Both is redundant.
- Drop the unused `Colors.surfaceDynamic` / `successHighlight` / `errorHighlight` palette entries that aren’t referenced anywhere.

---

## 6. Recommended fix order

If you want to action this list, I suggest:

1. **P0-1** Password hashing (quick + critical).
2. **P0-2** Stuck-in-processing OCR boot reset (1-line fix).
3. **Bug #6** Vault store-subscription → selector refactor (biggest perf win for free).
4. **Bug #8** Search index (visible perf improvement).
5. **P0-3** Move documents persistence to MMKV (large refactor, big payoff).
6. **Bug #18** AppState lock-on-inactive (UX papercut hit many times a day).
7. **Bug #11** Enhance button — either fix or remove.
8. **Bug #20** Incremental sync.
9. UI consolidation (theme dedupe, header normalization, emoji → icons).
10. Then the feature backlog.

---

_End of review. No source files were modified. This document lives at `/app/mobile/REVIEW.md`._
