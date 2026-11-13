# PlantCard — component test design

Component: `web/src/components/PlantCard.tsx`  
Props: `plant` (`PlantSummary`), `saved?` (boolean, default `false`), `onToggleSave?` (`(plantId: string) => void`).

A catalog card: image and name link to the plant, optional heart save toggle, Latin name, care badge, pet-safe tag, `PriceTag`, and rating. Used only on Browse (`BrowsePage` always passes `saved` and `onToggleSave`). `cy.mount` already wraps `MemoryRouter`. Do not assert CSS module classes, hover lift, heart fill, or plugin-slot output (`PlantCardSlot` is empty today). Do not re-run the full `PriceTag` two-decimal matrix here.

**Default `plant` for mount props** (typical in-stock catalog shape). Rows say only what they change:

```ts
const plant = {
  id: 'pl-monstera',
  name: 'Monstera Deliciosa',
  latinName: 'Monstera deliciosa',
  price: 24.5,
  light: 'medium',
  careLevel: 1 as const,
  petSafe: false,
  stock: 12,
  rating: 4.7,
  imageUrl: '/plants/monstera.svg',
};
```

| ID | kind | given (props) | the user does | expected | source | technique |
| --- | --- | --- | --- | --- | --- | --- |
| PC-01 | render | default `plant`, `onToggleSave` spy | mounts | An article with heading **Monstera Deliciosa** (level 3) and Latin name **Monstera deliciosa** | APP-MAP L31 — name, Latin name | equivalence class — typical summary |
| PC-02 | render | default `plant`, `onToggleSave` spy | mounts | An image named **Monstera Deliciosa** | PRODUCT.md L62 — every meaningful image has alternative text; APP-MAP L31 — image | accessibility — image name (`alt`) |
| PC-03 | render | default `plant`, `onToggleSave` spy | mounts | Exactly two links named **Monstera Deliciosa**, both with href `/plants/pl-monstera` | APP-MAP L31 — image and name link to the plant; PRODUCT.md L12 — `/plants/:plantId` | equivalence class — `plant.id` in both hrefs |
| PC-04 | render | default `plant` except `id="pl-snake"`, `name="Snake Plant"`, `onToggleSave` spy | mounts | Both plant links have href `/plants/pl-snake` | APP-MAP L31 — links use `plant.id`; PRODUCT.md L12 — `/plants/:plantId` | equivalence class — different `id` |
| PC-05 | render | default `plant` (`price={24.5}`), `onToggleSave` spy | mounts | Visible text includes **$24.50** | PRODUCT.md L31 — every price in dollars with **two decimals** (`$12.50`, never `$12.5`) | composition — fractional dollars (pad `.00`) |
| PC-06 | boundary | default `plant` except `price={22}`, `onToggleSave` spy | mounts | Visible text includes **$22.00** | PRODUCT.md L31 — two decimals everywhere | boundary — whole dollars (pad `.00`) |
| PC-07 | boundary | default `plant` except `price={0}`, `onToggleSave` spy | mounts | Visible text includes **$0.00** | PRODUCT.md L31 — two decimals everywhere | boundary — zero price |
| PC-08 | render | default `plant` (`rating={4.7}`), `onToggleSave` spy | mounts | Visible **4.7**; accessible text includes **out of 5** | APP-MAP L31 — rating "4.7 out of 5" | equivalence class — typical rating |
| PC-09 | boundary | default `plant` except `rating={0}`, `onToggleSave` spy | mounts | Visible **0.0**; accessible text includes **out of 5** | APP-MAP L31 — rating "n out of 5" | boundary — rating 0 |
| PC-10 | boundary | default `plant` except `rating={5}`, `onToggleSave` spy | mounts | Visible **5.0**; accessible text includes **out of 5** | APP-MAP L31 — "out of 5" | boundary — rating 5 |
| PC-11 | state | default `plant` except `stock={0}`, `onToggleSave` spy | mounts | **Out of stock** is shown | APP-MAP L31 — overlay when `stock === 0` | state — out of stock |
| PC-12 | boundary | default `plant` except `stock={1}`, `onToggleSave` spy | mounts | **Out of stock** is not shown | APP-MAP L31 — overlay only when `stock === 0` | boundary — 1 in stock (one above 0) |
| PC-13 | accessibility | default `plant` (omit `onToggleSave`) | mounts | There are no buttons | PRODUCT.md L61 — every button has a name (none here); APP-MAP L31 — heart only if `onToggleSave` is given | accessibility — button names (N/A); `onToggleSave` absent |
| PC-14 | state | default `plant`, `onToggleSave` spy (omit `saved`) | mounts | A button is present; pressed is false | APP-MAP L31 — `aria-pressed`; default `saved` false | default prop — `saved` false |
| PC-15 | state | default `plant`, `saved={true}`, `onToggleSave` spy | mounts | The save button’s pressed state is true | APP-MAP L31 — `aria-pressed` | state — `saved` true |
| PC-16 | interaction | default `plant`, `saved={false}`, `onToggleSave` spy | clicks the save button | `onToggleSave` called once with `'pl-monstera'`; pressed stays false until the parent updates `saved` | APP-MAP L31 — callback `(plantId)`; L15 — Browse keeps saved ids | callback + controlled `saved` |
| PC-17 | render | default `plant` (`careLevel={1}`), `onToggleSave` spy | mounts | **Easy care** | PRODUCT.md L32 — 1 **Easy** | equivalence class — `careLevel` 1 |
| PC-18 | render | default `plant` except `careLevel={2}`, `onToggleSave` spy | mounts | **Moderate care** | PRODUCT.md L32 — 2 **Moderate** | equivalence class — `careLevel` 2 |
| PC-19 | render | default `plant` except `careLevel={3}`, `onToggleSave` spy | mounts | **Expert care** | PRODUCT.md L32 — 3 **Expert** | equivalence class — `careLevel` 3 |
| PC-20 | render | default `plant` except `petSafe={true}`, `onToggleSave` spy | mounts | **Pet safe** | APP-MAP L34 — "Pet safe" | equivalence class — `petSafe` true |
| PC-21 | render | default `plant` (`petSafe={false}`), `onToggleSave` spy | mounts | **Not pet safe** | APP-MAP L34 — "Not pet safe" | equivalence class — `petSafe` false |
| PC-22 | boundary | default `plant` except a very long `name` (100+ characters), `onToggleSave` spy | mounts | The level-3 heading (and its link) include the full name | APP-MAP L31 — name on the card; Browse grid shows long catalog names | boundary — extreme `name` |
| PC-23 | accessibility | default `plant`, `saved={false}`, `onToggleSave` spy | mounts | The save button has a non-empty accessible name | PRODUCT.md L61 — every button has a name a screen reader can announce | accessibility — button name (`saved` false) |
| PC-24 | accessibility | default `plant`, `saved={true}`, `onToggleSave` spy | mounts | The save button has a non-empty accessible name | PRODUCT.md L61 — every button has a name (`saved` does not remove the control) | accessibility — button name (`saved` true) |
| PC-25 | accessibility | default `plant`, `onToggleSave` spy | mounts | Exactly one button (the save control) | PRODUCT.md L61 — every button has a name; APP-MAP L31 — heart is the only control | accessibility — button count when save is shown |
| PC-26 | accessibility | default `plant`, `saved={false}`, `onToggleSave` spy | focuses the save button and activates it with the keyboard | `onToggleSave` called with `'pl-monstera'` | PRODUCT.md L64 — keyboard alone | accessibility — keyboard |

## Test-lead checklist

| Check | Coverage |
| --- | --- |
| Every prop / field that changes the card | **`plant.id`** PC-03 (default id), PC-04 (other id → href). **`plant.name`** PC-01, PC-02, PC-03, PC-22. **`plant.latinName`** PC-01. **`plant.price`** PC-05–PC-07. **`plant.rating`** PC-08–PC-10. **`plant.stock`** PC-11–PC-12. **`plant.careLevel`** PC-17–PC-19 (all three). **`plant.petSafe`** PC-20–PC-21 (both). **`plant.imageUrl`** — does not change accessible copy (alt is `name`; PC-02). **`plant.light`** — not rendered (no row). **`saved`** PC-14–PC-15 (both booleans). **`onToggleSave`** PC-13 absent vs spy on all other rows. |
| Boundaries at documented limits | **Price** PRODUCT.md two decimals: fractional pad PC-05, whole dollars PC-06, zero PC-07. **Rating** scale implied by "out of 5": 0 PC-09, 5 PC-10. **Stock** overlay at 0: show PC-11, hide at 1 PC-12. **Name** extreme length PC-22. No doc for rating rounding, negative stock, or invalid `careLevel` — no rows. |
| Every button has a name | **No buttons** when `onToggleSave` omitted PC-13. **Save shown, unsaved** PC-23. **Save shown, saved** PC-24. **Count** one button when save shown PC-25. |
| Image has a name | PC-02 |
| Keyboard | PC-26 |

## Notes

- **Save persistence** (`localStorage` `fernly_saved`) is Browse, not this component. Assert the callback argument, not storage.
- **Out-of-stock cannot be added** is the plant page (stepper / Add to cart). This card only shows the overlay.
- **PC-19** expects **Expert care** from PRODUCT.md even if today’s `CareLevelBadge` labels level 3 as Moderate (FINDINGS suspicion). Do not weaken the expected result.
- **PC-05–PC-07** spot-check `PriceTag` on the card without duplicating the full `PriceTag.md` matrix.
- Until PC-23 / PC-24 pass, query the save control with `findByRole('button')` without a name. A failing row promotes the unnamed-heart suspicion; do not change `web/src` to green the test (cypress rule §7).
- `PlantCardSlot` renders nothing until a plugin is dropped in `slots/plant-card/`. No slot row.
- Long-name **layout** (wrap inside card width) is asserted on Browse UI (`browse.cy.ts`); PC-22 only checks the full name appears in the heading and link.

## Approval

**Approved** — implemented in `web/cypress/component/PlantCard.cy.tsx` (PC-05, PC-06, PC-07 fail with F-02; PC-19 fails until `CareLevelBadge` shows Expert for level 3; PC-23, PC-24 fail until the save control has an accessible name). PC-26 passes.
