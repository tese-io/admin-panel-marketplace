# Syncing from Upstream (Mercur Admin Panel)

This repo is the admin panel for the Mercur marketplace. To pull in upstream changes while keeping TESE-specific customizations, use this guide.

## Remotes

- `origin` – your TESE fork.
- `upstream` – add the original Mercur admin panel repo, e.g.:
  ```bash
  git remote add upstream <mercur-admin-panel-repo-url>
  ```

## Merge workflow

1. Fetch and merge:
   ```bash
   git fetch upstream
   git merge upstream/main
   ```
   (Use the branch name upstream uses.)

2. Resolve conflicts. Keep or re-apply the **customizations** listed below.

## TESE customizations to preserve

- **Favicon** – `index.html` favicon (e.g. `public/favicon.png`).
- **Service order indicator** – in order detail, the “Service” badge when an order uses the “Service – no delivery” shipping option:
  - `src/routes/orders/order-detail/components/order-general-section/order-general-section.tsx` – `ServiceOrderBadge` component and its usage.

## Tips

- The service badge is additive (a new badge component); it should merge cleanly with upstream order detail changes if they don’t touch the same badge container.
