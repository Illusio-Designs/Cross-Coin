/**
 * DPDP global policy seeds. Inserted once (idempotently) as global rows
 * (brand_id = NULL) so all 7 stores serve the same copy. {{BRAND}} is filled
 * with each store's name and {{GSTIN}} with the single Company GSTIN field at
 * serve time (see controller/policyController.js getPublicPolicyByName).
 *
 * Titles must slugify to the slugs the storefronts request:
 *   Privacy Policy          -> privacy-policy
 *   Cancellation & Refund   -> cancellation-and-refund
 *   Shipping Policy         -> shipping-policy
 *   Terms & Conditions      -> terms-and-conditions
 */
const ADDRESS = 'Survey No. 1288, Vajepar, Third Floor, Royal Plaza, Opp. New Chandresh Society, Panchasar Road, Morbi - 363641, Gujarat, India';
const EMAIL = '<a href="mailto:obzusindia@gmail.com">obzusindia@gmail.com</a>';
const PHONE = '+91 97128 91700';
const OFFICER = 'Divyesh Kotadiya';

const PRIVACY = `<p>Last updated: 7 October 2026</p>
<p>This Privacy Policy explains how Obzus India Private Limited ("we", "us", "our"), which operates {{BRAND}}, collects, uses, shares and protects your personal data, and the rights you have under the Digital Personal Data Protection Act, 2023.</p>
<h2>1. Who we are</h2>
<p>{{BRAND}} is an online store operated by Obzus India Private Limited, a company registered in India (GSTIN {{GSTIN}}), with its registered office at ${ADDRESS}. For any privacy question contact us at ${EMAIL} or ${PHONE}.</p>
<h2>2. The personal data we collect</h2>
<ul>
<li><strong>Account &amp; contact details</strong> — your name, phone number and email address when you register or place an order.</li>
<li><strong>Order &amp; delivery information</strong> — shipping and billing addresses, the items you buy, order history and payment status.</li>
<li><strong>Communications</strong> — messages you send us through the contact form, WhatsApp or email, and your reviews.</li>
<li><strong>Technical &amp; usage data</strong> — with your consent, your device type, IP address, browser, pages viewed and marketing identifiers.</li>
<li><strong>Payment data</strong> — payments are processed by our gateway (Razorpay); we receive the transaction status and reference, not your full card details.</li>
</ul>
<h2>3. How and why we use your data</h2>
<ul>
<li>To create and manage your account and to process, deliver and support your orders.</li>
<li>To handle returns, refunds, loyalty points and customer service.</li>
<li>To send transactional messages about your orders (order and delivery updates by WhatsApp or email).</li>
<li>With your consent, to measure and improve the site (analytics) and show you relevant offers (marketing).</li>
<li>To meet legal obligations, including tax and accounting record-keeping.</li>
</ul>
<h2>4. Consent and its withdrawal</h2>
<p>We rely on your consent and, where applicable, on performing your order and meeting our legal obligations. Essential cookies are always on; analytics and marketing cookies stay off until you opt in through our cookie banner. You can change or withdraw consent any time via the "Cookie settings" link in the footer; withdrawal does not affect processing already carried out.</p>
<h2>5. Cookies and tracking</h2>
<p>Essential cookies keep you logged in, remember your cart and keep the site secure. With consent we also use analytics tools (Google Analytics, Microsoft Clarity, first-party visit measurement) and marketing tools (the Meta pixel). You control these through the cookie banner.</p>
<h2>6. Who we share your data with</h2>
<p>We do not sell your personal data. We share it only with service providers who process it on our behalf under contract:</p>
<ul>
<li>Payment processing — Razorpay.</li>
<li>Order fulfilment and delivery — our logistics and courier partners.</li>
<li>OTP and messaging — MSG91 and WhatsApp (Meta).</li>
<li>Media hosting, analytics and marketing — our hosting, image (ImageKit) and analytics/marketing providers above.</li>
</ul>
<p>We may also disclose data where required by law or to protect our legal rights.</p>
<h2>7. How long we keep it</h2>
<p>We keep personal data only as long as needed for the purposes above. Order and invoice records are retained as long as tax and company law require. Analytics, marketing and enquiry data are deleted on a rolling schedule, and abandoned guest records are cleared periodically.</p>
<h2>8. Your rights under the DPDP Act</h2>
<ul>
<li><strong>Access</strong> — download a copy of the personal data we hold, from your account page.</li>
<li><strong>Correction</strong> — update your name, email and other details from your account page.</li>
<li><strong>Erasure</strong> — delete your account and personal data from your account page; we keep only the anonymised order records tax law requires.</li>
<li><strong>Withdraw consent</strong> — through the cookie settings link at any time.</li>
<li><strong>Grievance redressal</strong> — contact our Grievance Officer (below), and escalate to the Data Protection Board of India if unresolved.</li>
<li><strong>Nominate</strong> — nominate another person to exercise your rights in the event of death or incapacity.</li>
</ul>
<h2>9. Children</h2>
<p>Our stores are for adults. You must confirm you are 18 years or older to create an account, and we do not knowingly collect children's data or use it for tracking or targeted advertising.</p>
<h2>10. How we protect your data</h2>
<p>We apply reasonable security safeguards, including encryption of sensitive fields such as addresses at rest, access controls and secure payment processing. No method is completely secure, but we work to protect your data and will notify you and the Data Protection Board of a personal data breach as required by law.</p>
<h2>11. Changes to this policy</h2>
<p>We may update this policy from time to time. The "last updated" date shows when it last changed; significant changes are notified on this page.</p>
<h2>12. Grievance Officer</h2>
<p>For any question, request or complaint about your personal data, contact our Grievance Officer:</p>
<ul>
<li>Name: ${OFFICER}</li>
<li>Entity: Obzus India Private Limited</li>
<li>Email: ${EMAIL}</li>
<li>Phone: ${PHONE}</li>
<li>Address: ${ADDRESS}</li>
</ul>
<p>We respond within the timelines required under the DPDP Act, 2023.</p>`;

const REFUND = `<p>Last updated: 7 October 2026</p>
<p>This policy explains how to cancel an order and how returns and refunds work at {{BRAND}}, operated by Obzus India Private Limited.</p>
<h2>1. Order cancellation</h2>
<p>You can cancel an order before it is dispatched, from your account or by contacting us. Once dispatched, an order cannot be cancelled, but you may be able to return it after delivery (below).</p>
<h2>2. Return window</h2>
<p>You may request a return within <strong>7 days</strong> of delivery. To be eligible, items must be unused, unworn and in their original condition with tags and packaging intact.</p>
<h2>3. How to request a return</h2>
<p>Sign in, open the order under "My Orders" and start a return, or contact us at ${EMAIL} or ${PHONE}. Please include your order number and reason, and add photos where a product arrived damaged or incorrect.</p>
<h2>4. Non-returnable items</h2>
<ul>
<li>Items returned after the 7-day window, or without original tags and packaging.</li>
<li>Items that have been used, worn or washed, or are not in resaleable condition.</li>
<li>Items marked non-returnable on the product page, and free gifts or promotional items.</li>
</ul>
<h2>5. Refunds</h2>
<p>Once we receive and inspect the item we confirm whether the return is approved. Approved refunds go to your original payment method for prepaid orders; for Cash on Delivery, to the bank or UPI details you provide. Refunds are usually completed within 5–7 business days of approval; the time to appear depends on your bank.</p>
<h2>6. Exchanges</h2>
<p>For a different size or a replacement for a damaged item, request a return and place a new order, or contact us and we will help subject to availability.</p>
<h2>7. Return shipping costs</h2>
<p>Where an item is damaged, defective or incorrect, we bear the return shipping. For other returns, any shipping charge is as stated at the time of the return request.</p>
<h2>8. Contact</h2>
<p>For any question about a cancellation, return or refund, contact Obzus India Private Limited at ${EMAIL} or ${PHONE}.</p>`;

const SHIPPING = `<p>Last updated: 7 October 2026</p>
<p>This policy explains how {{BRAND}}, operated by Obzus India Private Limited, processes and delivers orders.</p>
<h2>1. Order processing</h2>
<p>Orders are usually processed within 1–2 business days of confirmation. You receive an update when your order is dispatched.</p>
<h2>2. Delivery timelines</h2>
<p>Delivery usually takes 3–7 business days after dispatch, depending on your location. Remote areas may take longer. These are estimates, not guarantees.</p>
<h2>3. Shipping charges</h2>
<p>Any shipping charge is shown at checkout before you pay. We may offer free shipping above a stated order value or during promotions.</p>
<h2>4. Cash on Delivery</h2>
<p>Cash on Delivery may be available at checkout for eligible orders and pin codes.</p>
<h2>5. Tracking your order</h2>
<p>Once dispatched, track your order from the "Track Order" page or the link in your dispatch message.</p>
<h2>6. Delays</h2>
<p>Delivery may occasionally be delayed by weather, courier disruptions, high demand or incorrect address details. If your order is significantly delayed, contact us and we will help.</p>
<h2>7. Serviceable areas</h2>
<p>We deliver across India to serviceable pin codes. If your pin code is not serviceable, checkout will let you know.</p>
<h2>8. Contact</h2>
<p>For any shipping question, contact Obzus India Private Limited at ${EMAIL} or ${PHONE}.</p>`;

const TERMS = `<p>Last updated: 7 October 2026</p>
<p>These Terms &amp; Conditions govern your use of {{BRAND}}, an online store operated by Obzus India Private Limited (GSTIN {{GSTIN}}), registered office ${ADDRESS}. By using the store or placing an order you agree to these terms.</p>
<h2>1. Eligibility</h2>
<p>You must be 18 years or older to create an account or place an order. By doing so you confirm you meet this requirement.</p>
<h2>2. Your account</h2>
<p>You are responsible for the details you provide and for activity on your account. Register with a phone number you control; an OTP verifies it.</p>
<h2>3. Products, pricing and availability</h2>
<p>We try to describe and price products accurately, but errors can occur. Prices and availability may change without notice, and we may limit or cancel quantities. If a product is mispriced, we may cancel the order and refund any amount paid.</p>
<h2>4. Orders and payment</h2>
<p>An order is an offer to buy; our confirmation forms the contract. Payments are handled securely by Razorpay, with Cash on Delivery where available. We may cancel an order for suspected fraud, a pricing error, or if it cannot be fulfilled.</p>
<h2>5. Shipping, returns and refunds</h2>
<p>Delivery, cancellation, returns and refunds are governed by our Shipping Policy and Cancellation &amp; Refund Policy, which form part of these terms.</p>
<h2>6. Intellectual property</h2>
<p>All content on the store — text, images, logos and design — belongs to Obzus India Private Limited or its licensors and may not be copied or reused without permission.</p>
<h2>7. Reviews and user content</h2>
<p>You are responsible for content you submit (such as reviews) and grant us a licence to display it. We may remove content that is unlawful, misleading or offensive.</p>
<h2>8. Acceptable use</h2>
<p>You agree not to misuse the store, interfere with its operation, attempt unauthorised access, or use it for any unlawful purpose.</p>
<h2>9. Disclaimers and liability</h2>
<p>The store is provided on an "as is" basis. To the extent permitted by law, Obzus India Private Limited is not liable for indirect or consequential loss; nothing in these terms excludes liability that cannot be excluded under law.</p>
<h2>10. Governing law</h2>
<p>These terms are governed by the laws of India, and the courts at Morbi, Gujarat have jurisdiction, subject to applicable consumer-protection law.</p>
<h2>11. Changes</h2>
<p>We may update these terms from time to time; the "last updated" date shows when they last changed. Continued use after a change means you accept the updated terms.</p>
<h2>12. Contact</h2>
<p>Questions about these terms: Obzus India Private Limited, ${EMAIL}, ${PHONE}.</p>`;

module.exports = [
  { title: 'Privacy Policy', content: PRIVACY },
  { title: 'Cancellation & Refund', content: REFUND },
  { title: 'Shipping Policy', content: SHIPPING },
  { title: 'Terms & Conditions', content: TERMS },
];
