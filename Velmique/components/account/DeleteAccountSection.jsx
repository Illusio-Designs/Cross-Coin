'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { deleteAccount, exportMyData } from '@/lib/api/auth'

// DPDP data rights (S11 access + S12 erasure). Lets a shopper download a copy
// of the personal data held about their account, or permanently delete it. The
// delete path collects explicit consent, runs the backend cross-table erasure,
// logs the user out, and shows a success message before redirecting home.
export default function DeleteAccountSection() {
  const router = useRouter()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [dlBusy, setDlBusy] = useState(false)
  const [dlError, setDlError] = useState('')

  const RED = '#b42318'

  const download = async () => {
    setDlError('')
    setDlBusy(true)
    try {
      const blob = await exportMyData()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setDlError(e.message || 'Could not prepare your data. Please try again.')
    } finally {
      setDlBusy(false)
    }
  }

  const run = async () => {
    setError('')
    setBusy(true)
    try {
      await deleteAccount()
      try { await logout() } catch (e) { /* session cleared regardless */ }
      setDone(true)
      setTimeout(() => { router.push('/') }, 3500)
    } catch (e) {
      setError(e.message || 'Could not delete your account. Please try again.')
      setBusy(false)
    }
  }

  return (
    <section style={{ marginTop: 40, border: '1px solid rgba(0,0,0,.14)', padding: '22px 20px' }}>
      <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Your data &amp; privacy</h3>
      <p style={{ margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.6, opacity: 0.8 }}>
        Download a copy of the personal data we hold about your account, or permanently delete your
        account under the DPDP Act, 2023. Your order and invoice records are kept in anonymised form as
        tax law requires; everything else is erased. Deletion cannot be undone.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={download}
          disabled={dlBusy}
          style={{ border: '1px solid rgba(0,0,0,.4)', color: 'inherit', background: 'transparent', padding: '10px 18px', fontSize: 12, letterSpacing: '.04em', textTransform: 'uppercase', cursor: dlBusy ? 'not-allowed' : 'pointer', opacity: dlBusy ? 0.6 : 1 }}
        >
          {dlBusy ? 'Preparing…' : 'Download my data'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(true); setConsent(false); setError('') }}
          style={{ border: `1px solid ${RED}`, color: RED, background: 'transparent', padding: '10px 18px', fontSize: 12, letterSpacing: '.04em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          Delete account
        </button>
      </div>
      {dlError && <p style={{ color: RED, fontSize: 13, margin: '12px 0 0' }}>{dlError}</p>}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget && !busy && !done) setOpen(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}
        >
          <div style={{ background: '#fff', color: '#17150f', maxWidth: 440, width: '100%', padding: '28px 26px', boxShadow: '0 20px 60px -20px rgba(0,0,0,.5)' }}>
            {done ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#1a7f37', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 24 }}>✓</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Account deleted</h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, opacity: 0.8 }}>
                  Your account and personal data have been permanently deleted. You have been logged out.
                  Taking you to the home page…
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ margin: '0 0 10px', fontSize: 18, color: RED }}>Delete your account?</h3>
                <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.6, opacity: 0.85 }}>
                  This permanently deletes your account and personal data — addresses, cart, wishlist and
                  contact history. Order and invoice records are retained in anonymised form for tax
                  compliance. This action cannot be undone.
                </p>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 18px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3, accentColor: RED }} />
                  <span>I understand this permanently deletes my account and personal data, and I consent to this erasure.</span>
                </label>
                {error && <p style={{ color: RED, fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setOpen(false)}
                    style={{ border: '1px solid rgba(0,0,0,.2)', background: 'transparent', color: 'inherit', padding: '10px 18px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!consent || busy}
                    onClick={run}
                    style={{ border: `1px solid ${RED}`, background: RED, color: '#fff', padding: '10px 18px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', cursor: (!consent || busy) ? 'not-allowed' : 'pointer', opacity: (!consent || busy) ? 0.5 : 1 }}
                  >
                    {busy ? 'Deleting…' : 'Permanently delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
