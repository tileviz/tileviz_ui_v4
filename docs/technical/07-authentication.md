# Authentication

## User Roles

| Role | Access |
|---|---|
| `admin` | Full platform access — all shops, all users, all tiles, all inventory |
| `shop_owner` | Own shop — manage sales persons, approve tile requests, view inventory |
| `sales_person` | Own data — create visualizations, save designs, view shared inventory |

---

## Login Flow

```
App Launch
    ↓
SplashScreen (animation)
    ↓
AppNavigator checks SecureStore / localStorage for access token
    ├── Token found → GET /auth/me → success → skip intro → main app
    ├── Token found → GET /auth/me → 401 → clear tokens → show Intro
    └── No token → show IntroScreen
         ↓
    IntroScreen → tap "Get Started"
         ↓
    AuthScreen (Login / Register form)
         ↓
    POST /auth/login or /auth/register
         ↓
    Store access token + refresh token
         ↓
    setUser() → navigate to Visualizer screen
```

---

## Token Storage

```ts
TOKEN_KEYS = {
  access:  'tileviz_access_token',
  refresh: 'tileviz_refresh_token',
}
```

- **Native**: `expo-secure-store` (encrypted storage)
- **Web**: `localStorage` (browser)

---

## Token Refresh

The Axios interceptor in `src/api/client.ts` handles automatic refresh:

```
API call → 401 Unauthorized
    ↓
Read refresh token from storage
    ↓
POST /auth/refresh
    ├── Success → save new access token → retry original request
    └── Failure → emit 'unauthorized' event → logout
```

`authBus` (EventEmitter) broadcasts the `unauthorized` event.
`AppNavigator` listens and calls `handleLogout()` → clears user, shows Intro.

---

## Role-Based UI

Screens and features shown/hidden based on `user.role`:

| Feature | admin | shop_owner | sales_person |
|---|---|---|---|
| Dashboard tab | ✅ | ✅ | ❌ |
| Admin tab | ✅ | ❌ | ❌ |
| Delete inventory | ✅ | ✅ | ❌ |
| Approve tile requests | ❌ | ✅ | ❌ |
| Save inventory | ✅ | ✅ | ✅ |
| Request tile to catalog | ❌ | ❌ | ✅ |
| View all shops (admin panel) | ✅ | ❌ | ❌ |

---

## Logout

```ts
await apiLogout()        // POST /auth/logout with refresh token
clearTokens()            // remove from SecureStore / localStorage
setUser(null)            // clears auth store
setActivePage('visualizer')
setShowIntro(true)       // back to intro screen
setVisitedPages(new Set()) // reset all mounted screens
```
