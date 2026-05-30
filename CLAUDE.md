# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
2. `calculateNutrition()` from `constants/nutrition.ts` looks up per-100g data and scales by weight
3. `addRecord()` pushes a `FoodRecord` into the store
4. Computed properties in the store aggregate totals via `calculateNutritionTotals()` from `utils/index.ts`

### Two parallel type/util systems

The codebase has **two sets of type/utility abstractions** that are not reconciled:

- **Active (used by views/store)**: `src/types/index.ts` (`FoodRecord`, `DailyNutrition`, `NutritionGoals`) and `src/utils/index.ts` (`calculateNutritionTotals`)
- **Unused (more elaborate)**: `src/types/diet.ts` (`MealRecord`, `NutritionEvaluation`, `NutritionStatus`, etc.) and `src/utils/nutritionCalculator.ts` (`evaluateIntake`, `calculateDailyNutrition`)

The `diet.ts` types define a richer model with `MealRecord` grouping foods by meal, `NutritionEvaluation` with low/normal/high/danger status, and kidney-friendly mode. None of this is wired to the UI. If adding meal-grouping or nutrition evaluation features, use these existing types rather than creating new ones.

### Food nutrition data

`src/constants/nutrition.ts` — hardcoded per-100g nutrition data for 5 food types (rice, egg, pork, chicken, beef). The `calculateNutrition(foodType, weight)` function scales linearly by ratio.

`src/constants/recommended.ts` — daily recommended ranges for `normal` and `kidney` user modes, plus helper functions for status check and coloring.
