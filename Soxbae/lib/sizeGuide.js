/* Size chart shown from the product page ("Size chart" link under the sizes).
   Fill in `rows` with the real measurements to switch it on — the link and the
   modal stay hidden while `rows` is empty, so no made-up sizes are ever shown.

   Example row: { size: 'M', fits: 'UK 6 – 9', foot: '24 – 27 cm' } */
// Sensible default socks size chart — the admin can adjust these values to match
// the actual range stocked. Row shape is { size, fits, foot } (see SizeChartModal).
export const SIZE_GUIDE = {
  note: 'All Soxbae socks have a comfortable stretch. Pick by your usual shoe size — if you are between two, size up.',
  tip: 'Foot length is measured heel to longest toe while standing.',
  rows: [
    { size: 'Free Size',   fits: 'UK 6 – 11', foot: '24 – 28 cm' },
    { size: 'Small / Medium', fits: 'UK 5 – 8',  foot: '22 – 25 cm' },
    { size: 'Large / XL',  fits: 'UK 9 – 12', foot: '26 – 29 cm' },
  ],
};
