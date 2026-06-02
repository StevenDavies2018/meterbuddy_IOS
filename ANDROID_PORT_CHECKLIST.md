# MeterBuddy Android Port Checklist

Use this checklist to mirror the iOS repo updates into the Android repo. The goal is to keep Android behavior and UX aligned with the iOS app while preserving Android-specific build config.

## Source and Target

- Source/reference repo: `D:\meterBuddyApp_IOS`
- Android repo to update: `D:\MeterBuddy`
- Run TypeScript after changes:

```powershell
cd D:\MeterBuddy
cmd /c npx tsc --noEmit
```

## 1. Sign-In UX

Update `src/app/sign-in.tsx`.

- Default auth mode should be `sign-in`, not `create`.
- Keep `Create account` as the secondary tab.
- Password and confirm-password fields should have Show/Hide toggles.
- Add accessibility labels/hints to:
  - Create account mode button
  - Sign in mode button
  - Email field
  - Show/Hide password buttons
  - Submit button
  - Back button
  - Error dismiss action
- Use the blue MeterBuddy card styling for the form instead of the dark/black themed card.
- After successful sign-in, route to `/scan`, not dashboard.

## 2. Password Reset

Update `src/lib/meter-service.ts`.

- Add:

```ts
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    throw error;
  }
}
```

Update `src/stores/app-flow.tsx`.

- Import `requestPasswordReset`.
- Add `sendPasswordReset: (email: string) => Promise<void>` to the context type.
- Implement `sendPasswordReset(email)`:
  - Normalize email with `trim().toLowerCase()`.
  - If empty, set/throw `Enter your email address before requesting a password reset.`
  - Set auth loading state while sending.
  - On success set notice: `Password reset email sent. Check your inbox for the reset link.`
  - On error set `lastError`.
- Include `sendPasswordReset` in the provider value.

Update `src/app/sign-in.tsx`.

- In Sign in mode only, add a `Forgot password?` button.
- It should call `sendPasswordReset(email)`.
- It should be disabled while auth is loading.

Supabase setup note:

- Verify Supabase Auth password reset redirect/site URL before release.

## 3. Settings Screen Copy and Actions

Update `src/app/(tabs)/settings.tsx`.

Settings copy should be truthful:

- Reminder timing:
  - `MeterBuddy sets the next reading reminder for 28 days after each saved reading.`
- MeterBuddy Pro:
  - `Free users use the standard processing queue. A lifetime Pro unlock enables priority processing on supported scans.`
- Data and exports:
  - `Exports and web dashboard tools are available on the MeterBuddy website.`

Add two Settings actions:

- `View walkthrough`
  - Routes to `/onboarding?source=settings`.
  - Accessibility label: `View walkthrough`.
- `Send feedback`
  - Opens `mailto:support@meterbuddy.ca`.
  - Prefill app version, build, device, and OS details.
  - Uses `expo-constants`, `expo-device`, `Linking`, and `Platform`.

## 4. Onboarding / Walkthrough

Update `src/app/onboarding.tsx`.

- Keep the 3-step walkthrough:
  - Take a clear photo
  - Confirm before save
  - Track the next cycle
- Support `source=settings` query param using `useLocalSearchParams`.
- If opened from Settings:
  - `Close`, `Back to settings`, and finishing should return to `/(tabs)/settings`.
- If opened for first-run:
  - finishing should still call `completeOnboarding()` and route to `/sign-in?source=onboarding`.
- Add accessibility labels for:
  - Close/Skip onboarding
  - Continue/Get started button
  - Back to settings/Skip onboarding lower action
- Remove corrupted/special characters from CTA/icon text. Use ASCII-safe `->` if needed.

## 5. Bottom Navigation Consistency

Update `src/components/app-bottom-nav.tsx`.

- Add accessibility metadata:
  - `accessibilityRole="tab"`
  - `accessibilityLabel={item.label}`
  - `accessibilityState={{ selected }}`

Update `src/app/(tabs)/_layout.tsx`.

- Use the custom `AppBottomNav` as the actual `Tabs` tab bar so Dashboard, Account, and Settings always show the same rounded colored bottom buttons.
- Use `usePathname()` to choose active tab:
  - `/settings` -> `settings`
  - `/account` -> `account`
  - otherwise `dashboard`

## 6. Dashboard Cleanup

Update `src/app/(tabs)/index.tsx`.

- Remove the right-side caret/chevron from Recent Activity rows. They are not clickable and should not look clickable.
- Replace tiny saved meter photo thumbnails with status badges:
  - Meter status card: `Photo saved` or `No photo yet`
  - Recent Activity row: `Saved`
- Keep actual photos for confirm/review screens, not dashboard thumbnails.
- Add accessibility labels/hints to:
  - Main `Scan reading` card
  - Create account prompt
  - Dashboard error dismiss action
- Replace special/corrupted symbol characters with plain text where present.

## 7. Scan Screen

Update `src/app/scan.tsx`.

- Pro users should bypass the standard processing queue using `hasProAccess`.
- Free users should see standard processing queue copy:
  - Title: `Standard processing queue`
  - Body: `Priority processing is not enabled on this account, so this scan is in the standard processing queue.`
  - Capture button queued copy: `Your scan is in the standard processing queue. The confirm screen will open automatically.`
- Add accessibility labels/states to:
  - Meter type selector buttons
  - Error dismiss card
  - Camera/take picture button

## 8. Confirm Screen

Update `src/app/confirm.tsx`.

- Save/validation warnings should show with native `Alert.alert`, not a subtle inline card.
- `Confirm and save` should be the primary action and appear above `Back to scan`.
- Add accessibility labels/hints to:
  - Confirmed reading input
  - Confirm and save button
  - Back to scan button

## 9. Logout Flow

Update `src/app/(tabs)/account.tsx`.

- Sign out must route to `/sign-in`, not dashboard.
- Add accessibility labels/hints to:
  - Pro purchase action
  - Restore purchases
  - Manage purchase
  - Sign out
  - Delete account

## 10. RevenueCat Android Notes

Android should use the Android/Google RevenueCat key, not the Apple key.

In `.env.local` for Android repo:

```env
EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=YOUR_ANDROID_REVENUECAT_KEY
```

Use one RevenueCat project with two apps:

- MeterBuddy iOS
- MeterBuddy Android

Use one entitlement concept across both:

```text
meterbuddy_pro
```

Current compatibility note:

- iOS code currently tolerates `meterbuddy Pro`, `meterbuddy_pro`, and `lifetime_unlock`.
- For Android, prefer clean entitlement `meterbuddy_pro` when testing is ready.

RevenueCat packages:

```powershell
cd D:\MeterBuddy
cmd /c npx expo install react-native-purchases react-native-purchases-ui
```

Because RevenueCat is native, rebuild/reinstall Android after installing/wiring it.

## 11. Business Rule and Android Crash Fix

Keep these Android fixes in place or port if missing:

- `src/lib/meter-service.ts`
  - Before saving, fetch the latest saved reading for the meter.
  - Block saves where the new confirmed value is less than or equal to the previous value.
  - Error: `This reading must be greater than the last saved reading for this meter.`
- `src/stores/app-flow.tsx`
  - Deduplicate readings/results/reminders before setting state on refresh and after local save.
  - This avoids duplicate image-backed rows causing Android/Fabric mount issues.

## 12. Verification

After porting:

```powershell
cd D:\MeterBuddy
cmd /c npx tsc --noEmit
```

Manual Android test pass:

- App opens to expected first-run/onboarding flow.
- Sign in is default on auth screen.
- Create account still works.
- Forgot password sends reset email.
- Login routes to Scan.
- Scan captures image.
- Free account enters standard processing queue.
- Pro account bypasses queue when RevenueCat is configured.
- Confirm and save validates reading is greater than previous.
- Save routes to Dashboard.
- Logout routes to Sign in.
- Settings shows accurate 28-day reminder/web export copy.
- View walkthrough returns to Settings.
- Send feedback opens email.
- Bottom nav stays visually consistent across Dashboard, Account, and Settings.
