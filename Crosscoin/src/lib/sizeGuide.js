/* Size chart shown from the product page ("Size Chart" link under the sizes).
   Shared socks standard across the sibling storefronts. Row shape is
   { size, fits, foot } (see components/products/SizeChartModal.jsx). The link
   and modal stay hidden while `rows` is empty, so no made-up sizes are shown. */
export const SIZE_GUIDE = {
  note: 'All Cross Coin socks have a comfortable stretch. Pick by your usual shoe size — if you are between two, size up.',
  tip: 'Foot length is measured heel to longest toe while standing.',
  rows: [
    { size: 'Free Size',      fits: 'UK 6 – 11', foot: '24 – 28 cm' },
    { size: 'Small / Medium', fits: 'UK 5 – 8',  foot: '22 – 25 cm' },
    { size: 'Large / XL',     fits: 'UK 9 – 12', foot: '26 – 29 cm' },
  ],
};
