

# Fix Build Errors in AIInsights.tsx

The app cannot load due to syntax errors in `src/pages/AIInsights.tsx`. These must be fixed before testing the Sync Payments button.

## Errors Found

All on lines 71-94 and line 225 — broken arrow function syntax and a typo:

1. **Lines 71-72**: `sales.filter((s =>` should be `sales.filter(s =>`  (extra opening paren)
2. **Lines 74-75**: `reduce((sum: number, s =>` should be `reduce((sum: number, s) =>`  (missing closing paren on params)
3. **Line 77**: `(hthisMonthTotal` — typo, should be `(thisMonthTotal`; also missing opening paren for the expression
4. **Line 81**: `forEach((s =>` — extra paren
5. **Lines 87, 90**: `filter((c =>` — extra paren, missing closing paren
6. **Lines 93-94**: `reduce((sum: number, p =>` — missing closing paren on params
7. **Line 225**: `''{metrics...}` — broken template, should be `''}{metrics...}` or use a proper ternary

## Changes

**File: `src/pages/AIInsights.tsx`**
- Fix all arrow function parameter syntax on lines 71-94
- Fix typo `hthisMonthTotal` → `thisMonthTotal` on line 77
- Fix string interpolation on line 225

After fixing, navigate to `/subscription` and click "Sync Payments" to verify the feature works.

