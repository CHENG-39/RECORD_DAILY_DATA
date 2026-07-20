# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

All commands run from `diet-tracker/`:

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # Type-check + build for production
npm run preview      # Preview production build locally
```

There are no test suites or linters configured.

## Architecture

This is a **mobile web diet-tracking app** — Vue 3 + TypeScript + Vite, targeting mobile viewports.

**Entry**: `src/main.ts` → mounts Vue app with Pinia (state) + Vue Router.
**Auto-import**: Vant UI components are auto-registered via `unplugin-vue-components` + `VantResolver`. Do not manually import Vant components in `.vue` files.
**Viewport**: `postcss-px-to-viewport-8-plugin` converts all px to vw units based on a **375px design width**. Write CSS in px; the build transforms it to vw.

### Routing (3 tabs)

| Path | View | Meta title |
|------|------|------------|
| `/` | `HomeView` | 今日记录 |
| `/history` | `HistoryView` | 历史记录 |
| `/stats` | `StatsView` | 统计分析 |

`NavBar.vue` reads `route.meta.title` for the top bar. `TabBar.vue` syncs the active tab index to `route.path`.

### State management

Single Pinia store: `src/stores/diet.ts` (`useDietStore`).

- `records: FoodRecord[]` — all food records ever added, persisted via `pinia-plugin-persistedstate`
- `goals: NutritionGoals` — daily nutrition targets
- Computed `todayRecords` / `todayNutrition` filter by `getTodayString()`
- Methods: `addRecord`, `deleteRecord`, `updateGoals`, `getRecordsByDate`, `getDailyNutrition`

State is persisted to localStorage automatically.

### Data flow

1. User picks food type + weight + meal type in HomeView dialog
2. `calculateNutritionFromDefinition()` from `constants/nutrition.ts` looks up per-100g data (from `data/foods.ts`) and scales by weight
3. `addRecord()` pushes a `FoodRecord` into the store
4. Computed properties in the store aggregate totals via `calculateNutritionTotals()` from `utils/index.ts` (which also computes `totalPRAL` and `totalBioavailablePhosphorus`)

### Composable pattern

`src/composables/useDashboardMetrics.ts` — extracts dashboard-related computed properties (calorie ring chart, key metrics with status evaluation, expandable minor metrics) from HomeView. This reduces the view file size and keeps business logic testable in isolation.

### Food nutrition data

`src/data/foods.ts` — built-in food database with 80+ foods across 7 categories (主食/肉类水产/蔬菜/水果/坚果种子/豆制品/乳制品). Each food is a `FoodDefinition` with per-100g nutrition data sourced from USDA FoodData Central. Includes helper functions for phosphorus bioavailability (`getPhosphorusBioavailability`), potassium/phosphorus risk assessment (`getPotassiumRisk`, `getPhosphorusRisk`), and P/Pro ratio (`getPtoProteinRatio`, `getPtoProteinLevel`).

`src/constants/nutrition.ts` — provides `calculateNutritionFromDefinition(food, weight)` which scales per-100g data linearly by weight ratio.

`src/constants/recommended.ts` — daily recommended ranges (`RECOMMENDED_NUTRITION`) for `normal` and `kidney` user modes, plus `USER_MODE_CONFIG` for display labels.
