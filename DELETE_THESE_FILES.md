# DELETE THESE FILES FROM YOUR REPO

These old files are causing TypeScript errors at build time.
Delete them from GitHub directly (go to each file → Edit → Delete file → Commit).

## Files to DELETE:

- `frontend/page.tsx`                          ← old root-level page, conflicts with app/page.tsx
- `frontend/globals.css`                       ← old root-level CSS, conflicts with app/globals.css
- `frontend/postcss.config.mjs`               ← duplicate of postcss.config.js
- `frontend/eslint.config.mjs`                ← replaced by .eslintrc.json

- `frontend/components/ProductCard.tsx`        ← imports Product from wrong place
- `frontend/components/SourceSection.tsx`      ← imports SourceResult from wrong place
- `frontend/components/StatusBadge.tsx`        ← imports ScrapeStatus from wrong place
- `frontend/components/AIRecommendation.tsx`   ← old component, replaced
- `frontend/components/SearchBar.tsx`          ← old component, replaced

- `frontend/components/search/SiteFilter.tsx`  ← old version, replaced
- `frontend/components/search/SkeletonLoader.tsx` ← old version, replaced by SearchSkeleton.tsx
- `frontend/components/search/EmptyState.tsx`  ← old version with wrong props, replaced in States.tsx
- `frontend/components/search/ErrorState.tsx`  ← old version, replaced in States.tsx

- `frontend/components/ui/Navbar.tsx`          ← old Navbar with broken anchor tags
- `frontend/components/landing/`              ← entire landing/ folder (not used in new app)
- `frontend/components/ui/MotionProvider.tsx`  ← not used in new app

## After deleting, push the new files from the zip.
