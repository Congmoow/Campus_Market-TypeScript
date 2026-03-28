# Profile Save Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the personal-profile edit flow so saved profile changes persist and immediately render correctly.

**Architecture:** Align the frontend payload with the backend update contract, extend the backend update path to persist all fields the profile page edits, and return a response shape consistent with the profile page's read model. Add regression tests at the backend service layer and the frontend API/client layer before implementation.

**Tech Stack:** React, TypeScript, Express, Prisma, Vitest, Jest

---

### Task 1: Lock the failing behavior with tests

**Files:**
- Modify: `backend/src/services/__tests__/user.service.test.ts`
- Modify: `frontend/src/api/__tests__/index.test.ts`

**Step 1: Write the failing backend regression test**

Add a test that calls `updateUserProfile()` with `major`, `grade`, `campus`, `avatarUrl`, and `phone`, and expects those fields to be persisted and returned in the updated profile shape.

**Step 2: Run test to verify it fails**

Run: `npm --prefix backend test -- --runInBand user.service.test.ts`

Expected: FAIL because the current service ignores those fields.

**Step 3: Write the failing frontend contract test**

Add a test that calls `userApi.updateProfile()` with the profile-edit form payload and verifies the client sends the normalized request payload expected by the backend.

**Step 4: Run test to verify it fails**

Run: `npm --prefix frontend test -- src/api/__tests__/index.test.ts`

Expected: FAIL because the current client forwards mismatched field names.

### Task 2: Implement the minimal contract and persistence fix

**Files:**
- Modify: `backend/src/types/shared.ts`
- Modify: `backend/src/services/user.service.ts`
- Modify: `frontend/src/api/index.ts`
- Modify: `frontend/src/components/EditProfileModal.tsx`
- Modify: `frontend/src/pages/UserProfile.tsx`

**Step 1: Expand the shared update profile contract**

Add the fields actually edited by the profile page and allow both legacy and current key names where needed for compatibility.

**Step 2: Update backend persistence**

Persist every editable field to the correct Prisma columns and return a response shape consistent with `getUserProfile()`.

**Step 3: Normalize the frontend request payload**

Map the modal form state to the backend contract instead of sending raw form state blindly.

**Step 4: Keep local profile state consistent after save**

Make sure the success path updates profile/local user cache with the returned shape used by the page and navbar.

### Task 3: Verify the fix

**Files:**
- No additional code changes required

**Step 1: Run the targeted backend test**

Run: `npm --prefix backend test -- --runInBand user.service.test.ts`

Expected: PASS

**Step 2: Run the targeted frontend API test**

Run: `npm --prefix frontend test -- src/api/__tests__/index.test.ts`

Expected: PASS

**Step 3: Run a focused end-to-end sanity check**

Run: `npm test -- --runInBand`

Expected: Pass where unaffected existing tests are healthy, or clearly surface unrelated pre-existing failures.
