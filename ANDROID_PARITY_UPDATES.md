# Android Parity Updates

This file summarizes the UX, navigation, and setup changes made in the iOS-focused repo so the Android version can be updated to match.

## Mirror These Changes On Android

### 1. Sign-in screen UX cleanup

File changed here:
- `src/app/sign-in.tsx`

What changed:
- Restyled the `Create account` / `Sign in` mode switch so the active option is clearly selected.
- Changed the main `Sign in` / `Create account` action into a strong primary button instead of a neutral gray card.
- Changed error messaging cards so login failures look like feedback, not tappable primary actions.
- Restyled the secondary/back action so it reads as a secondary control.
- Changed the authenticated follow-up action from a generic continue button to a clearer `Start first scan`.

Why:
- The original screen made primary and secondary actions look too similar.
- Invalid credential messaging looked like another button instead of an error state.

### 2. Post-login flow goes to Scan first, not Dashboard

Files changed here:
- `src/app/sign-in.tsx`

What changed:
- After successful sign-in, navigation now goes to `/scan`.
- After account creation, the follow-up CTA also sends the user to `/scan`.

Why:
- Users were landing on the dashboard first and did not know what to do next.
- The scan flow is the real first task, so it should be the first post-login destination.

### 3. Removed redundant first-scan screen

Files changed here:
- `src/app/index.tsx`
- `src/app/_layout.tsx`
- `src/stores/app-flow.tsx`
- deleted `src/app/first-scan.tsx`

What changed:
- Removed the old `first-scan` route from the stack.
- Removed the redirect that sent authenticated users to `/first-scan`.
- Deleted the screen file itself.
- Removed the related `hasCompletedFirstScanPrompt` state and `markFirstScanPromptComplete` logic from the app flow store.

Why:
- That screen duplicated a decision the user already makes on the real scan screen.
- It added friction and confusion without adding value.

### 4. Scan completion goes to Dashboard, not separate Results screen

Files changed here:
- `src/app/confirm.tsx`
- `src/app/_layout.tsx`
- deleted `src/app/results.tsx`

What changed:
- After `Confirm and save`, navigation now goes to `/(tabs)` instead of `/results`.
- Removed the `results` route from the stack.
- Deleted the separate `results` screen file.

Why:
- The extra results screen interrupted the main flow.
- The intended user flow is now:
  - login/create account
  - scan
  - confirm/save
  - dashboard

### 5. Logout now sends the user to the login screen

File changed here:
- `src/app/(tabs)/account.tsx`

What changed:
- After logout completes, navigation now immediately routes to `/sign-in`.

Why:
- Previously the app cleared auth state but visually left the user in the tab flow, which felt like they were still in the app.

### 6. Scan queue messaging clarified

File changed here:
- `src/app/scan.tsx`

What changed:
- Reworded the queue/processing copy to explain that the wait is due to standard processing because priority processing is not enabled.
- Reworded the button/body copy so it no longer sounds like the timer is just a normal intentional part of the happy path.

Why:
- The old text made the wait feel arbitrary and confusing.
- The updated wording explains that the delay is part of the non-priority queue behavior.

### 7. Confirm screen action hierarchy improved

File changed here:
- `src/app/confirm.tsx`

What changed:
- Moved `Confirm and save` above `Back to scan`.
- Restyled `Confirm and save` as the clear primary action.
- Restyled `Back to scan` as the secondary action.
- Stacked the actions vertically instead of side-by-side.

Why:
- The save action should be visually dominant.
- The old layout gave equal weight to the primary and secondary actions.

## iOS-Only Changes

These were needed for the iOS repo, but are not Android parity work.

### 1. iOS Expo app config

File changed earlier:
- `app.json`

What changed:
- Added iOS app config fields such as:
  - `ios.bundleIdentifier`
  - `ios.buildNumber`
  - `ios.supportsTablet`

### 2. iOS EAS build profiles

File changed earlier:
- `eas.json`

What changed:
- Added explicit iOS-oriented build profiles such as:
  - `ios-development`
  - `ios-simulator`
  - `ios-preview`
  - `ios-production`

### 3. Local env file for Supabase boot

Local file created earlier:
- `.env.local`

What changed:
- Added the required Expo public Supabase env vars so the iOS build could boot without crashing:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Why:
- The iOS repo had no local env file, so the app crashed on startup with missing Supabase env variables.

## Current App Flow

The intended flow after these changes is:

1. Onboarding
2. Sign in / create account
3. Scan screen
4. Confirm and save
5. Dashboard

On logout:

1. Sign out
2. Return to sign-in screen

## Files Changed For UX / Flow Work

- `src/app/(tabs)/account.tsx`
- `src/app/_layout.tsx`
- `src/app/confirm.tsx`
- `src/app/index.tsx`
- `src/app/scan.tsx`
- `src/app/sign-in.tsx`
- `src/stores/app-flow.tsx`
- deleted `src/app/first-scan.tsx`
- deleted `src/app/results.tsx`

