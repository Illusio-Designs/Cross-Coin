# Test homepage bundle banners

The bundle section on `/test` reads the brand's active **Build Your Pack** tiers.
Its saving labels and links are calculated from those tiers, never from a
hardcoded promotional percentage. An unconfigured section stays hidden.

## Change images without redeploying

1. Upload the two banner images in **Dashboard → Media Library** and copy each
   public HTTPS image URL. Landscape photographs around 1400 × 1000 work well.
2. Open **Dashboard → Brands → Velmique → Brand Settings**.
3. Add or edit these custom settings in **General**, with encryption off:
   - `HOME_BUNDLE_IMAGE_1`: first banner image URL.
   - `HOME_BUNDLE_IMAGE_2`: second banner image URL.
4. Save and reload `/test`. Public content may be cached for up to one minute.

If an image is not configured, the card uses a live product photograph, then
an existing local perfume image. Keep photographs free of discount text so
changes to the backend tiers cannot leave an old percentage printed in them.
Only these two public settings are exposed by `/api/public/home-bundles`;
credentials and other Brand Settings are not returned.

## Change offers

Edit the store-wide Build Your Pack tiers for **Velmique** in the existing
bundle admin. For example, Any 2 → 15%, Any 3 → 20%. Keep both active. The first
two tiers appear on the homepage. The pack builder supports all active tiers,
with an in-stock size/variation selector for each fragrance.

Group prices are recomputed when quantities change or a pack item is removed.
COD and prepaid checkout both reprice from the brand's database tiers. Browser
prices and percentages are display estimates, never authoritative order inputs.
