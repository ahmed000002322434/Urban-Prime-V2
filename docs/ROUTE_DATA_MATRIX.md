# Route Data Matrix (Core + High-Risk)

| Route | Primary Service | Primary Backend/Table | Fallbacks | Notes |
|---|---|---|---|---|
| `/` | `itemService.getItems` | `mirror_documents(items)` / `items` | Firestore items, local mock | Must not silently return empty when backend is available. |
| `/browse` | `itemService.getItems` | same as above | same | Filters + pagination contract. |
| `/item/:id` | `itemService.getItemById` | `mirror_documents(items)` / `items` | Firestore by id, local mock | Must support missing backend row gracefully. |
| `/auth` | `authService.login/register/signInWithGoogle` | `/auth/sync-user`, `users` | Firestore user profile | Backend sync required for Supabase-first. |
| `/user/:id` | `userService.getPublicProfile` | `users`, `personas`, `items` | Firestore profile/storefront | Public profile cannot hard-fail on missing storefront. |
| `/profile` | `useAuth` + dashboard services | `users`, `personas` | Firestore user | Provider ordering must remain valid. |
| `/profile/products` | `itemService.getItemsByOwner` | `mirror_documents(items)` / `items` | Firestore owner queries, local mock | Seller list page. |
| `/profile/activity` | `itemService.getOwnerActivity` | `audit_logs` / `/activity/*` | Firestore audit_logs | Must always resolve route and show deterministic state. |
| `/profile/messages` | chat service(s) | `chat_threads`, `chat_messages` | Firestore chat | Persona-aware thread ownership next hardening step. |
| `/profile/switch-accounts` | `personaService` | `personas`, `persona_capability_requests` | Firestore personas, local cache | Onboarding funnel + active persona persistence. |
| `/cart` | cart context + service | `carts`, `cart_items` | Firestore cart | Guest merge handled at auth transition. |
| `/checkout` | checkout service | `orders`, `order_items`, `payments` | Firestore orders | Must write actor persona IDs when available. |
| Pixe upload flows | `uploadService` | `/uploads`, `uploaded_assets` | local blob cache (dev) | Files on backend disk, metadata in Supabase. |

## Environment Flags
- `VITE_DATA_MODE`
- `VITE_ENABLE_FIRESTORE_FALLBACK`
- `VITE_ENABLE_LOCAL_MOCK_FALLBACK`
- `VITE_REQUIRE_BACKEND`
- `VITE_BACKEND_URL`

## Observability Touchpoints
- `/health`
- `/activity/summary/:personaId`
- `/personas/:id/notifications`
- browser dev diagnostics banner (DEV only)
