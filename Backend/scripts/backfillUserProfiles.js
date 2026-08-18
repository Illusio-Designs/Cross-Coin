/**
 * Backfill real names/emails onto placeholder consumer accounts.
 *
 * Phone-OTP login auto-creates a consumer with a placeholder name
 * ("User 7600046416 (b10)") and email ("7600046416@phone.crosscoin.in")
 * because only the phone is known at that moment. This script upgrades those
 * placeholders using the shopper's real details, matched by the deterministic
 * phone hash:
 *   1. a matching guest_users record (first_name/last_name + real email), else
 *   2. the most recent shipping_addresses.full_name for that phone/user.
 *
 * It also relinks any still-guest orders/addresses for that phone to the user.
 *
 * Idempotent and safe to re-run — it only touches accounts whose name still
 * looks like the "User <digits>" placeholder or whose email is still the
 * "@phone.crosscoin.in" placeholder, and never overwrites a real value.
 *
 * Requires phone_hash to be populated (index.js backfills it on boot). Run:
 *   cd Backend && node scripts/backfillUserProfiles.js
 */
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');
const { phoneHash } = require('../utils/encryption.js');

async function backfillUserProfiles() {
    const [users] = await sequelize.query(`
        SELECT id, username, email, phone FROM users
        WHERE role = 'consumer'
          AND phone IS NOT NULL AND phone <> ''
          AND (email LIKE '%@phone.crosscoin.in' OR username REGEXP '^User [0-9]')
    `);

    let fixed = 0;
    for (const u of users) {
        const digits = String(u.phone).replace(/\D/g, '').slice(-10);
        if (digits.length !== 10) continue;
        const h = phoneHash(digits);
        if (!h) continue;

        let name = '';
        let email = '';

        // 1) Guest record by phone hash — the richest source (name + email).
        const [g] = await sequelize.query(
            `SELECT first_name, last_name, email FROM guest_users
             WHERE phone_hash = ? ORDER BY updated_at DESC LIMIT 1`,
            { replacements: [h] }
        );
        if (g.length) {
            name = [g[0].first_name, g[0].last_name].filter(Boolean).join(' ').trim();
            if (g[0].email && !g[0].email.endsWith('@phone.crosscoin.in')) {
                email = String(g[0].email).toLowerCase();
            }
        }

        // 2) Fallback: a shipping address name for this user or phone.
        if (!name) {
            const [a] = await sequelize.query(
                `SELECT full_name FROM shipping_addresses
                 WHERE (user_id = ? OR phone_hash = ?) AND full_name IS NOT NULL AND full_name <> ''
                 ORDER BY id DESC LIMIT 1`,
                { replacements: [u.id, h] }
            );
            if (a.length) name = String(a[0].full_name).trim();
        }

        // Relink any still-guest orders/addresses for this phone to the user.
        const [gm] = await sequelize.query(
            `SELECT id FROM guest_users WHERE phone_hash = ?`, { replacements: [h] }
        );
        const guestIds = gm.map(r => r.id);
        if (guestIds.length) {
            try {
                await sequelize.query(
                    `UPDATE orders SET user_id = :uid, guest_user_id = NULL
                     WHERE guest_user_id IN (:ids) AND user_id IS NULL`,
                    { replacements: { uid: u.id, ids: guestIds } }
                );
                await sequelize.query(
                    `UPDATE shipping_addresses SET user_id = :uid, guest_user_id = NULL
                     WHERE guest_user_id IN (:ids) AND user_id IS NULL`,
                    { replacements: { uid: u.id, ids: guestIds } }
                );
            } catch (e) { logger.warn('[backfillUserProfiles] relink failed for user ' + u.id + ': ' + e.message); }
        }

        // Build the patch — never overwrite a real value.
        const sets = [];
        const repl = [];
        if (name && /^User [0-9]/.test(u.username || '')) { sets.push('username = ?'); repl.push(name); }
        if (email && u.email && u.email.endsWith('@phone.crosscoin.in')) {
            const [taken] = await sequelize.query(
                `SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1`,
                { replacements: [email, u.id] }
            );
            if (!taken.length) { sets.push('email = ?'); repl.push(email); }
        }
        if (sets.length) {
            repl.push(u.id);
            await sequelize.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, { replacements: repl });
            fixed++;
        }
    }

    logger.info(`[backfillUserProfiles] Updated ${fixed}/${users.length} placeholder consumer profiles`);
    return { scanned: users.length, fixed };
}

module.exports = { backfillUserProfiles };

// Run directly: node scripts/backfillUserProfiles.js
if (require.main === module) {
    backfillUserProfiles()
        .then((r) => { console.log('Done:', r); process.exit(0); })
        .catch((e) => { console.error('Failed:', e); process.exit(1); });
}
