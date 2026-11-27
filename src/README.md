# Partner App - Feature-Based Architecture

## 🏗️ Folder Structure

The tree below is the real one. It used to describe a scaffold that no longer
existed (an `app/` folder, an `OTPScreen`, per-module `api/` folders, a
`theme/colors.ts` palette), which sent people looking for files that were not
there.

```
src/
├── navigation/              # RootNavigator, AuthNavigator, MainTabNavigator,
│                            # types.ts (the one param-list source), navigationRef
│
├── modules/                 # Feature modules — screens only; API and hooks are shared
│   ├── auth/                #   Login, Signup, ForgotPassword, ResetPassword, KycOnboarding
│   ├── onboarding/          #   Splash
│   ├── dashboard/           #   Dashboard (Home tab), Notifications
│   ├── jobs/                #   Route, LiveJob, CompleteJob, JobSuccess, SosConfirm,
│   │                        #   BookingDetails, JobTimeline, PhotoEvidence,
│   │                        #   SlotExpired, GeofenceBlocked, JobHistory
│   ├── earnings/            #   Earnings, Transactions
│   ├── performance/         #   Performance
│   ├── profile/             #   Profile (+ its modals), Schedule, Inventory
│   └── support/             #   TicketList, CreateTicket, TicketDetails
│
├── components/
│   ├── atoms/               # Text, Icon, StatusChip, SegmentedTabs, TextField, OtpBoxes
│   ├── molecules/           # ScreenHeader, JobTimeline, SwipeToConfirm, GateChecklistItem,
│   │                        # RouteStopCard, ModalSheet, AuthLayout, LoadingScreen,
│   │                        # ErrorScreen, RaiseIssueModal, GeofenceViolationModal,
│   │                        # DelayBanner, AppAlertModal, AppGateScreen, InAppNotificationModal
│   ├── layout/              # ScreenContainer
│   ├── organisms/           # BottomTabBar
│   └── common/              # FallbackImage
│
├── services/
│   ├── api/                 # One module per backend area (booking, wallet, kyc, …) + client.ts
│   ├── api.service.ts       # Shared request helper
│   ├── auth.service.ts      # send-otp / verify-otp / login / register/partner
│   ├── location/            # GPS + tracking
│   ├── notification/        # FCM + in-app notifications
│   └── alert/               # Routes Alert.alert into AppAlertModal
│
├── hooks/                   # useTheme, useScreenInsets, useActiveJob, useAttendance,
│                            # useDashboard, useProfile, useEarnings, usePerformance,
│                            # useJobHistory, useTransactions, useTodaySchedule,
│                            # useLocationTracking, useAppGate
│
├── store/                   # auth.store.ts (Zustand)
│
├── theme/                   # tokens.ts (semantic light/dark tokens — the palette),
│                            # textStyles.ts, jobStatus.ts, typography.ts, spacing.ts
│
├── utils/                   # format, location, validation, validators, permissions,
│                            # camera.utils, payoutGuard, errorHandler, logger, device, fcm
│
├── constants/               # api.constants.ts, app.constants.ts
│
└── types/                   # api.types.ts, global.d.ts
```

## 🎯 Feature Module Structure

Each module is **self-contained** with:
- `screens/` - Module screens
- `components/` - Module-specific components
- `api/` - API calls for this feature
- `hooks/` - Custom hooks for this feature
- `types.ts` - TypeScript types

## ✅ Benefits

1. **Easy to find code** - Everything for "jobs" is in `modules/jobs/`
2. **Easy to delete features** - Remove entire module folder
3. **Team scalability** - Different devs work on different modules
4. **Short imports** - `./api/jobs.api.ts` instead of `../../../`
5. **Clear ownership** - Each module has dedicated owner

## 🚀 Next Steps

1. Install dependencies:
   ```bash
   npm install axios react-native-mmkv
   npm install @react-navigation/native @react-navigation/stack
   ```

2. Configure services:
   - Update `services/apiClient.ts` with your API base URL
   - Setup `services/storage.ts` with MMKV

3. Add navigation:
   - Create `app/navigation/RootNavigator.tsx`
   - Setup Auth vs App navigation split

4. Implement modules:
   - Start with `auth` module
   - Then `jobs` (core feature)
   - Add others as needed

## 📝 Module Guidelines

- Keep modules **independent** (minimal cross-module imports)
- Share common components via `components/`
- Share utilities via `utils/`
- Module-specific logic stays in module
