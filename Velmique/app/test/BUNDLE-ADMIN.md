# Test homepage bundle banners

The bundle section on `/test` reads the brand's active **Build Your Pack** tiers.
Its saving labels and links are calculated from those tiers, never from a
hardcoded promotional percentage. An unconfigured section stays hidden.

## Upload images directly in the pack editor

1. Open **Dashboard → Pack pricing** and choose **Velmique**.
2. In **Build Your Pack — store-wide tiers**, edit the tier (e.g. Any 2).
3. Use **Bundle banner image → Upload image**, then save the tier.
4. Reload `/test`. That tier's homepage card uses its saved image.

The editor previews the upload and lets you replace or remove it. JPG, PNG and
WebP files up to 5 MB are supported. Landscape images at 3:2 work best.
An uploaded file is applied only when you save the tier. The image follows the
tier's ID, so reordering/deleting offers cannot move it to the wrong offer.
Product-specific pack forms also support images; only store-wide tiers appear
in the homepage bundle section.

No generated artwork is installed by default. A card without a saved image
uses its clean background. Discounts are rendered as live text, never baked
into the image. Older HOME_BUNDLE_IMAGE_1 / HOME_BUNDLE_IMAGE_2 settings remain
supported as a fallback, but no manual Brand Settings entry is needed anymore.
Tier image associations use the existing brand-scoped settings table; no new
database column or schema migration is required.

## Change offers

Edit the store-wide Build Your Pack tiers for **Velmique** in the existing
bundle admin. For example, Any 2 → 15%, Any 3 → 20%. Keep both active. The first
two tiers appear on the homepage. The pack builder supports all active tiers,
with an in-stock size/variation selector for each fragrance.

Group prices are recomputed when quantities change or a pack item is removed.
COD and prepaid checkout both reprice from the brand's database tiers. Browser
prices and percentages are display estimates, never authoritative order inputs.
