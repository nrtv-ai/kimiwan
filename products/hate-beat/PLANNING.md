# Hate Beat Hardening Plan

Date: 2026-02-27
Owner: Codex + Sungwan

## Goal
Stabilize release readiness and remove immediate security/quality risks found during codebase analysis.

## Completed In This Change Set
- Removed hardcoded Android release signing credentials from build config.
- Added secure signing configuration via:
  - `android/keystore.properties` (local file)
  - or environment variables (`HATEBEAT_KEYSTORE_PATH`, `HATEBEAT_KEYSTORE_PASSWORD`, `HATEBEAT_KEY_ALIAS`, `HATEBEAT_KEY_PASSWORD`).
- Added `android/keystore.properties.example` template.
- Added `keystore.properties` to Android `.gitignore`.
- Fixed gameplay deadlock when custom input yields zero valid words.
- Fixed canvas DPI/resize scaling drift by resetting transform before scaling.
- Corrected pointer coordinate mapping to match canvas scale.
- Unified Android back-button handling through a single web handler.
- Sanitized high-score rendering before HTML insertion.
- Updated release docs in `README.md` and `RELEASE_GUIDE.md` to match secure signing flow.

## Remaining Work (Next Sprint)
- Run full native sync and validate Android build pipeline on clean machine:
  - `npm run sync`
  - `cd android && ./gradlew assembleDebug`
  - `cd android && ./gradlew assembleRelease`
- Decide single source of truth for web bundle (`web/` vs `www/`) and remove drift.
- Add minimal automated regression checks (lint/static checks + smoke path test).
- Remove or archive stale status/report markdown files to reduce repo noise.

## Validation Notes
- Shell scripts parse successfully (`build.sh`, `test.sh`, `setup-icons.sh`).
- Gradle evaluation proceeds past signing config changes.
- Current build is blocked later by missing generated Capacitor plugin artifacts until `npx cap sync` is run.

## Merge Checklist
- [x] Security fix for signing secrets
- [x] Runtime gameplay + input stability fixes
- [x] Back-button behavior consistency
- [x] Documentation updated
- [ ] Run `npm run sync` and final Android release build verification
