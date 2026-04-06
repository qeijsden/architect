# Auth Prompt Pack (Google + Username + PlayFab)

Use these prompts directly with Copilot/AI coding agents.

## 1) Enforce signup-first auth

```text
Switch authentication to signup-first. Users should create an account (not generic sign-in), and account setup must use Google OAuth.

Requirements:
- Replace sign-in-centric copy with create-account wording.
- Auth should not be considered complete until setup requirements are met.
- Add clear UX for setup-required states.
- Keep Steam mode behavior intact.
```

## 2) Require username during onboarding

```text
After Google auth succeeds, force the user to complete username setup before entering the app.

Rules:
- Username required, 3-20 chars, letters/numbers/underscore only.
- Save username to Clerk user profile (username field).
- Mirror username to local profile display_name.
- While username is missing, treat user as not fully authenticated and redirect to /auth.
```

## 3) Require Google-linked account

```text
Enforce that only Google-linked Clerk users are treated as authenticated for cloud features.

Rules:
- Add a requiresGoogleAuth state.
- If a non-Google account is present, show a blocking message and offer sign out.
- Redirect callback/auth routes correctly when setup is incomplete.
```

## 4) Keep PlayFab identity cross-device

```text
Ensure PlayFab login uses a stable account identifier tied to the auth provider account so the same user logs into the same PlayFab profile on new PCs.

Rules:
- Use Clerk user id as PlayFab CustomId for cloud login.
- Keep display name synced from chosen username.
- Do not create separate local-only identities for authenticated users.
```

## 5) Verification prompt

```text
Add a verification checklist and run it:
- New user signs up with Google -> must set username -> reaches home.
- Existing Google user logs in on another PC -> same PlayFab identity is used.
- User without Google-linked auth cannot pass authenticated gate.
- Build passes with no TypeScript errors.
```
