# RevenueCat Expo Setup For MeterBuddy

This repo uses RevenueCat through Expo with:

- `react-native-purchases`
- `react-native-purchases-ui`

The SDK is configured from JavaScript in `src/stores/app-flow.tsx`. Do not add the native Kotlin/Swift setup snippets to this Expo app.

## Installed Packages

Already installed with:

```bash
npx expo install react-native-purchases react-native-purchases-ui
```

Because RevenueCat includes native code, rebuild the iOS app after installing or changing native dependencies:

```bash
eas build --platform ios --profile ios-development
```

## Local Environment

The iOS RevenueCat public SDK key is read from:

```env
EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY=test_dpXRsCNTdUjYLcwnWUzmoyBapzw
```

This lives in `.env.local` for local development. Add the same value to EAS environment variables for cloud builds if needed.

## RevenueCat Dashboard Setup

Create or confirm these identifiers in RevenueCat.

Entitlement:

```text
meterbuddy_pro
```

Display name:

```text
MeterBuddy Pro
```

Product:

```text
lifetime
```

Offering:

```text
default
```

Attach the `lifetime` product to the default offering. RevenueCat Paywalls use the current/default offering, so the app does not hardcode product selection UI.

## App Store Connect Setup

Create the matching in-app purchase in App Store Connect:

```text
lifetime
```

Recommended product type:

- `lifetime`: non-consumable one-time purchase

Then connect those products to RevenueCat and attach them to the `meterbuddy_pro` entitlement.

## App Integration

The main integration lives in:

```text
src/stores/app-flow.tsx
```

It handles:

- RevenueCat configuration using the Expo public API key
- customer info retrieval with `Purchases.getCustomerInfo()`
- auth identity syncing with `Purchases.logIn(authUserId)`
- entitlement updates with `Purchases.addCustomerInfoUpdateListener(...)`
- restore purchases with `Purchases.restorePurchases()`
- paywall presentation with `RevenueCatUI.presentPaywallIfNeeded(...)`
- customer center with `RevenueCatUI.presentCustomerCenter()`

The app checks:

```text
meterbuddy_pro
```

It also temporarily recognizes:

```text
lifetime_unlock
```

That fallback exists only because the original Supabase entitlement schema already used `lifetime_unlock`.

## UI Integration

Account screen:

```text
src/app/(tabs)/account.tsx
```

Includes:

- `Unlock MeterBuddy Pro`
- `Restore purchases`
- `Manage subscription`
- Pro access status

Scan screen:

```text
src/app/scan.tsx
```

Uses `hasProAccess` to skip the standard processing queue for Pro users.

## Testing Checklist

1. Rebuild the iOS development build.
2. Install on iPhone.
3. Sign in to MeterBuddy.
4. Open `Account`.
5. Tap `Unlock MeterBuddy Pro`.
6. Confirm the RevenueCat paywall opens.
7. Complete a sandbox purchase.
8. Confirm account status changes to `Unlocked`.
9. Tap `Restore purchases` and confirm it succeeds.
10. Scan a meter and confirm Pro users skip the standard queue.

## Best Practices

- Keep RevenueCat as the source of truth for purchase state in the app.
- Use `CustomerInfo.entitlements.active` instead of storing purchase flags only in local state.
- Use `Purchases.logIn(authUserId)` after Supabase auth so RevenueCat purchases attach to the MeterBuddy account.
- Use RevenueCat Paywalls and Offerings instead of hardcoding product buttons in the app.
- Use Customer Center when users need restore, subscription management, or billing tools.
- Do not store `.p8` App Store Connect keys in the repo or `.env.local`; upload those only to RevenueCat.
