import { PublicShell } from '../components/layout/PublicShell';

export function TermsPage() {
  return (
    <PublicShell title="Terms of use">
      <p>MAP is a private space for men to book counselors and moderators as a handle. By creating an account you agree to use the service lawfully and respectfully.</p>
      <p>Sessions are not medical emergencies, not a substitute for in-person clinical care, and not a crisis line. You must be 18 or older.</p>
      <p>You stay a handle unless you grant a scoped reveal. Reveals can be revoked for future sessions; past sessions keep the context they had.</p>
      <p>We may suspend accounts for abuse. Payments are billed per session via M-Pesa where configured. Counselors are independent providers; MAP is the venue.</p>
    </PublicShell>
  );
}

export function PrivacyPage() {
  return (
    <PublicShell title="Privacy">
      <p>Your handle is what other members see. Recovery email and phone, if you add them, live in a separate identity vault — not in session data.</p>
      <p>Counselors and moderators do not see vault fields unless you grant a reveal for that relationship. Payment processors see what they need to charge, not therapy notes.</p>
      <p>Chat and video content are treated as ephemeral by default. We aim not to store message bodies in our primary database.</p>
      <p>Kenya’s Data Protection Act applies. You can ask to anonymize or delete your account from Account settings. Some billing records may be retained where the law requires it.</p>
    </PublicShell>
  );
}

export function HowItWorksPage() {
  return (
    <PublicShell title="How it works">
      <p>1. Create a handle. No legal name on the first screen.</p>
      <p>2. Answer a few intake questions so we know counselor vs moderator, and chat vs video.</p>
      <p>3. Find someone, or auto-match. Pay the session with M-Pesa. Join the room as a handle.</p>
      <p>4. If you want, reveal a first name, full name, or photo — only to that provider, and you can revoke it for next time.</p>
    </PublicShell>
  );
}

export function FaqPage() {
  return (
    <PublicShell title="FAQ">
      <p><strong className="text-cream">Will the counselor see my real name?</strong> Not unless you grant a reveal. Video with your camera on is still not a file reveal.</p>
      <p><strong className="text-cream">Is this therapy in a crisis?</strong> No. Use emergency services or the numbers on every screen.</p>
      <p><strong className="text-cream">What’s a moderator?</strong> Facilitated support / a lighter check-in. Not a substitute for a licensed counselor.</p>
      <p><strong className="text-cream">How do I pay?</strong> Per session, M-Pesa STK on the booking thread. Subscription packs are later.</p>
    </PublicShell>
  );
}

export function ForProvidersPage() {
  return (
    <PublicShell title="For counselors & moderators">
      <p>You get a public handle. Clients never see your legal identity in the product. The platform still verifies you — license in, review, then publish.</p>
      <p>Open a desk: slots, rates, auto-match requests, earnings. Accept a request within 15 minutes or it may reassign.</p>
      <p>Payouts are M-Pesa B2C once Daraja is live. Until then, ops may pay you out of band.</p>
    </PublicShell>
  );
}
