# Fernly app map

A map of the shop before testing: what each page shows, which components it uses, and which API calls it makes. Built from `web/src/pages`, `web/src/components`, `web/src/api`, the contract at `http://localhost:8100/openapi.json`, and a walk through `http://localhost:5173` signed out and signed in as Ava (`ava@fernly.test`).

This describes what the app **does**, not what it should do. Differences from [PRODUCT.md](PRODUCT.md) are listed as suspicions in [FINDINGS.md](../FINDINGS.md).

The web app calls the API through the Vite proxy at `/api/...`; the session token lives in `localStorage` under `fernly_token` and is sent as `Authorization: Bearer ...`.

## 1. Pages

Every page is rendered inside `Layout` (`web/src/pages/Layout.tsx`): skip link, header with Shop, Orders (signed in only), Cart with a count badge, and Sign in or "Hi, name" with Sign out. On start-up, if a token is saved, the app calls `GET /api/auth/me`; if that fails the token is dropped. While signed in, the header calls `GET /api/cart` for the badge.

| Path | What it shows | API calls it makes | Its states (loading, empty, error, signed out) |
| --- | --- | --- | --- |
| `/` Browse (`BrowsePage.tsx`) | Hero, filter sidebar (search, light checkboxes, pet-safe toggle, sort), result count heading, grid of `PlantCard`s, Previous / "Page n of m" / Next. Filters live in the URL (`?search=&light=low,bright&petSafe=true&sort=&page=`). Saved (heart) plants are kept in `localStorage` (`fernly_saved`), not on the server. | `GET /api/plants?search&light&petSafe&sort&page` (always sends `sort` and `page`; page size is the API default, 12). | **Loading:** heading "Loading plants…" and six grey skeleton cards. **Empty:** "No plants match your filters / Try another search or clear a filter." **Error:** the same empty-state message as Empty; no error text and no Try again button. **Signed out:** same as signed in (public). |
| `/plants/:plantId` Plant (`PlantPage.tsx`) | Image, breadcrumb "Shop / light", name, Latin name, care badge, pet-safe tag, light tag, rating, description, price for the chosen size, size picker, quantity stepper, Add to cart, "n in stock", plugin slot, "Likes the same light" links. A toast confirms or reports the add. | `GET /api/plants/{plantId}`; `GET /api/plants?pageSize=48` (only to turn similar-plant ids into names); `POST /api/cart/lines` on Add to cart. | **Loading:** "Loading plant…". **Not found (404):** "We couldn't find that plant" with "Back to the shop". **Other error:** banner "The plant couldn't be loaded." with Try again. **Empty:** no similar section when `similar` is empty. **Out of stock:** stepper and button disabled, button reads "Out of stock", note "Out of stock right now." **Signed out:** page is public; Add to cart sends you to `/login?next=/plants/:plantId`. |
| `/login` Sign in (`AuthPages.tsx` `LoginPage`) | Email, password, Sign in button, link to create an account (keeps `next`). After success goes to `next` (only if it starts with `/`), else `/`. | `POST /api/auth/login`; then the cart query is refreshed (`GET /api/cart`). | **Loading:** button reads "Signing in…" and is disabled. **Error:** banner with the API's `detail`. **Empty:** n/a. **Signed out:** normal state. Signed-in visitors still see the form (no redirect). |
| `/register` Create an account (`AuthPages.tsx` `RegisterPage`) | Name, email, password with hint "At least 8 characters.", Create account button, link to sign in (keeps `next`). | `POST /api/auth/register`; then `GET /api/cart`. | **Loading:** "Creating…", disabled. **Error:** banner with the API's `detail` (no client-side checks). **Empty:** n/a. **Signed out:** normal state. |
| `/cart` Cart (`CartPage.tsx`) | "Your cart", one `CartLine` per line, `OrderSummary` (subtotal, shipping, total, free-shipping hint), plugin slot, "Go to checkout" link. Errors from changing a line show as a toast. | `GET /api/cart`; `PATCH /api/cart/lines/{lineId}` (stepper); `DELETE /api/cart/lines/{lineId}` (Remove). | **Auth not ready:** "Loading…". **Signed out:** redirect to `/login?next=/cart`. **Loading:** "Loading your cart…". **Error:** banner "Your cart couldn't be loaded." with Try again. **Empty:** "Your cart is empty / Plants you add will show up here." with "Browse plants". While a change is saving, all line controls are disabled. |
| `/checkout` Checkout (`CheckoutPage.tsx`) | Shipping address form (Full name, Street address, City, Postal code; `noValidate`, so the API validates) and `OrderSummary`. On success goes to `/orders/{id}?placed=1`. | `GET /api/cart`; `POST /api/orders` with `{ shippingAddress }`. | **Auth not ready:** "Loading…". **Signed out:** redirect to `/login?next=/checkout`. **Loading:** "Loading your cart…". **Error loading cart:** banner with Try again. **Empty:** "Your cart is empty / Add a plant before you check out." (no link). **Order refused:** banner with the API's raw `detail`, e.g. `shippingAddress.fullName: fullName must not be empty; …`. **Submitting:** "Placing order…", disabled. |
| `/orders` Orders (`OrdersPage.tsx` `OrdersPage`) | "Your orders": one row per order with a link "Order {id}", date, number of lines, total. | `GET /api/orders` (this query is not gated on sign-in, so it also fires while signed out). | **Auth not ready:** "Loading…". **Signed out:** redirect to `/login?next=/orders`. **Loading:** "Loading your orders…". **Error:** banner "Your orders couldn't be loaded." with Try again. **Empty:** "No orders yet / Your orders will show up here." |
| `/orders/:orderId` One order (`OrdersPage.tsx` `OrderPage`) | "Order {id}", "Placed {date} · Ships to {name}, {city}", one row per line with line total, `OrderSummary` titled "Paid". With `?placed=1` shows "Thank you! Your order is placed." | `GET /api/orders/{orderId}`. | **Auth not ready:** "Loading…". **Signed out:** redirect to `/login?next=/orders/:orderId`. **Loading:** "Loading order…". **Not found (404):** "Order not found" with "Back to your orders". **Other error:** banner "The order couldn't be loaded." with Try again. |
| `*` Not found (`App.tsx`) | "Page not found" with "Back to the shop". | None. | Static. |

## 2. Components

All in `web/src/components/`. Props are copied from each component's TypeScript interface; `CareLevelBadge` and `PetSafeTag` declare their props inline instead of with a named interface.

| Name | File | Props (from its TypeScript interface) | What it shows | Pages that use it |
| --- | --- | --- | --- | --- |
| `PlantCard` | `PlantCard.tsx` | `PlantCardProps { plant: PlantSummary; saved?: boolean; onToggleSave?: (plantId: string) => void }` | Image linking to the plant, "Out of stock" overlay when `stock === 0`, heart save toggle (only if `onToggleSave` is given, `aria-pressed`), name link, Latin name, `CareLevelBadge`, `PetSafeTag`, plant-card slot, `PriceTag`, rating "4.7 out of 5". | Browse |
| `PriceTag` | `PriceTag.tsx` | `PriceTagProps { amount: number; size?: 'sm' \| 'md' \| 'lg'; label?: string }` (`label` is read by screen readers only) | A dollar amount via `formatPrice` (`web/src/money.ts`), optionally preceded by a hidden label. | Plant, Orders, One order; also through `PlantCard` (Browse), `CartLine` (Cart), `OrderSummary` (Cart, Checkout, One order) |
| `CareLevelBadge` | `CareLevelBadge.tsx` | `{ level: 1 \| 2 \| 3 }` | One to three dots (hidden from screen readers) and "Easy / Moderate / Expert care". | Plant; through `PlantCard` (Browse) |
| `PetSafeTag` | `PetSafeTag.tsx` | `{ petSafe: boolean }` | "🐾 Pet safe" or "⚠ Not pet safe". | Plant; through `PlantCard` (Browse) |
| `QuantityStepper` | `QuantityStepper.tsx` | `QuantityStepperProps { value: number; onChange: (value: number) => void; min?: number; max: number; disabled?: boolean; label?: string }` (`min` defaults to 1, `label` to "Quantity"; `max` is "usually the stock left") | A group with "Decrease quantity" −, the value in a live `<output>`, "Increase quantity" +. | Plant; through `CartLine` (Cart) |
| `SizePicker` | `SizePicker.tsx` | `SizePickerProps { sizes: { label: SizeLabel; priceDelta: number }[]; value: SizeLabel; onChange: (size: SizeLabel) => void; name?: string }` | Fieldset "Size" with a radio card per size: Small / Medium / Large and "Base price" or "+$delta". | Plant |
| `CartLine` | `CartLine.tsx` | `CartLineProps { line: CartLine; onQuantityChange: (lineId: string, quantity: number) => void; onRemove: (lineId: string) => void; busy?: boolean }` | Image (decorative, `alt=""`), name, "Size S · $x each", `QuantityStepper` (max = line stock, label "Quantity of {name}"), line total, "Remove" (named "Remove {name}"). | Cart |
| `OrderSummary` | `OrderSummary.tsx` | `OrderSummaryProps { itemCount: number; subtotal: number; shipping: number; total: number; title?: string }` (`title` defaults to "Order summary"). Also exports `FREE_SHIPPING_FROM = 50`. | Subtotal (n items), Shipping ("Free" when 0 and there are items, else the price), Total, and "Add $x more for free shipping." when the subtotal is under $50. Displays the numbers it is given; it does not compute shipping. | Cart, Checkout, One order (title "Paid") |
| `EmptyState` | `Feedback.tsx` | `EmptyStateProps { title: string; message?: string; action?: ReactNode }` | Sprout icon, an `h2` title, optional message and action. | Browse, Plant, Cart, Checkout, Orders, One order, Not found |
| `ErrorBanner` | `Feedback.tsx` | `ErrorBannerProps { message: string; onRetry?: () => void }` | `role="alert"` banner with the message and an optional "Try again" button. | Plant, Cart, Checkout, Orders, One order, Sign in, Create an account |
| `Toast` | `Feedback.tsx` | `ToastProps { message: string; tone?: 'success' \| 'error'; onClose: () => void; duration?: number }` (closes itself after 4000 ms; 0 keeps it open) | `role="status"` message with a "Dismiss" × button. | Plant, Cart |
| `SearchBox` | `SearchBox.tsx` | `SearchBoxProps { value: string; onSearch: (value: string) => void }` | `role="search"` form: search input with a visual "Search plants" hint, "Clear search" × when there is text, Search button. Searches on submit, trimmed. | Browse |
| `LightFilter` | `LightFilter.tsx` | `LightFilterProps { value: Light[]; onChange: (value: Light[]) => void }` | Fieldset "Light" with checkboxes Low / Medium / Bright light. | Browse |
| `SortSelect` | `SortSelect.tsx` | `SortSelectProps { value: Sort; onChange: (value: Sort) => void }` | "Sort by" select: Featured, Price: low to high, Price: high to low, Name: A to Z, Best rated. | Browse |

Outside `components/`, `web/src/slots/Slot.tsx` provides `PlantPageSlot { plant: Plant }` (Plant page), `PlantCardSlot { plant: PlantSummary }` (inside `PlantCard`) and `CartSummarySlot { cart: Cart }` (Cart). They render whatever feature components are dropped into `slots/plant-page/`, `slots/plant-card/` and `slots/cart-summary/`; all three folders are empty today.

## 3. API

From the contract (OpenAPI 3.1, "Fernly Shop API" 1.0.0). "Needs sign-in" means the operation declares `bearer` security; every one of those documents a `401 auth_required` response.

| Method and path | Used by which page | Needs sign-in? |
| --- | --- | --- |
| `GET /api/health` | None (for tooling) | No |
| `POST /api/admin/reset` | None (for tooling and tests) | No |
| `GET /api/plants` | Browse (filters, sort, page); Plant (`pageSize=48`, for similar-plant names) | No |
| `GET /api/plants/{plantId}` | Plant | No |
| `POST /api/auth/register` | Create an account | No |
| `POST /api/auth/login` | Sign in | No |
| `GET /api/auth/me` | All pages, once at start-up when a token is saved (`AuthProvider`) | Yes |
| `GET /api/cart` | Layout header badge (every page while signed in), Cart, Checkout | Yes |
| `POST /api/cart/lines` | Plant (Add to cart) | Yes |
| `PATCH /api/cart/lines/{lineId}` | Cart (quantity stepper) | Yes |
| `DELETE /api/cart/lines/{lineId}` | Cart (Remove) | Yes |
| `POST /api/orders` | Checkout (Place order) | Yes |
| `GET /api/orders` | Orders | Yes |
| `GET /api/orders/{orderId}` | One order | Yes |

Contract details worth knowing when testing:

- Errors are `{ "detail": "...", "rule": "..." }`; 404 responses have no `rule`. Rules: `validation_error`, `auth_required`, `invalid_credentials`, `email_taken`, `stock_limit`, `empty_cart`.
- `GET /api/plants`: `page` ≥ 1 (default 1), `pageSize` 1–48 (default 12), `light` is comma-separated, `petSafe` is `"true"` or `"false"`, `sort` is one of `featured`, `price-asc`, `price-desc`, `name`, `rating`.
- `CartLineCreate` and `CartLineUpdate`: `quantity` is an integer from 1 to 20.
- `ShippingAddress`: `fullName`, `address`, `city` need at least 1 character; `postalCode` at least 3.
- `Register`: `password` at least 8 characters, `email` in email format.
- Money fields (`price`, `priceDelta`, `unitPrice`, `lineTotal`, `subtotal`, `shipping`, `total`) are described as "Dollars, two decimals."
- `GET /api/orders` is "newest first"; `GET /api/orders/{orderId}` returns 404 to anyone but the customer who placed it.
