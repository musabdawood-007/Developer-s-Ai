/**
 * Privacy Policy & Terms of Use for PULSE
 * ----------------------------------------------
 * Written for a public emotional-support product (PRD §6).
 * Used by the PrivacyTerms dialog and the /privacy and /terms pages.
 */

export const PRIVACY_POLICY = `## Privacy Policy

Welcome to **PULSE** — "Your Emotional Compass. Steady Mind. Clear Path." PULSE is an AI support companion, not a therapist. Because people share personal things here, this policy explains exactly what is collected, why, and what is (and is not) done with it. By using PULSE you agree to the practices below.

### 1. What PULSE Collects

- **Account (optional)** — if you create a saved account: your name, email, and a hashed password (never stored in plain text).
- **Anonymous guest sessions** — if you chat without signing up, PULSE creates an ephemeral guest profile tied only to a random identifier.
- **Usage metadata** — daily message counts used to enforce the free-tier limit (~10 messages/day).
- **Feedback signals** — the thumbs-up / thumbs-down you tap after a reply.

### 2. Your Conversations

Your messages are kept in your browser's \`localStorage\` for continuity between visits. They are **not** stored in PULSE's database. However, to generate a reply, each message you send is transmitted to PULSE's third-party AI provider (the underlying large language model service). That provider processes your message to produce a response under its own data terms. **Do not share information you are not comfortable sending to an AI provider.** No raw conversation logs are retained on PULSE servers.

### 3. Why PULSE Collects It

- **Personalisation** — remembering your name and the context of recent exchanges so PULSE doesn't ask twice.
- **Abuse prevention & rate limiting** — daily counts prevent spam and DDoS.
- **Product improvement** — anonymous feedback ratings help tune the empathy engine.

PULSE never sells, rents, or shares your data with advertisers or data brokers.

### 4. What PULSE Doesn't Do

- Doesn't read your browser-stored chat history (it never leaves your device).
- Doesn't sell or publicise anything you share.
- Doesn't track you across other websites.
- Doesn't email you unless you contacted the developer first.

### 5. Your Rights

- **Anonymous use** — chat as a guest without ever giving an email.
- **Be forgotten** — delete your account, or just clear your browser data to erase all locally stored history.
- **Use a nickname** — your real name is never required.

### 6. Children's Privacy

PULSE requires users to confirm they are **over 18 years old**. PULSE is not directed at children and does not knowingly collect data from anyone under 18. If you believe a minor has supported an account, contact the developer so it can be removed.

### 7. Crisis Situations

PULSE is not an emergency service. If you are in crisis, contact local emergency services or a crisis hotline. PULSE's crisis detection exists solely to point you toward real human help.

### 8. Changes to This Policy

Updated versions will be posted on this page with a new "last updated" date. Continued use after a change means you accept the new policy.

### 9. Contact

Questions? Email the developer, Musab Dawood: musabdaud007@gmail.com`;

export const TERMS_OF_USE = `## Terms of Use

These Terms govern your access to and use of **PULSE**, an AI emotional-support companion created by Musab Dawood. By starting a conversation, you agree to the following.

### 1. PULSE Is an AI, Not a Human

PULSE is an artificial intelligence. It is **not** a human, not a therapist, not a doctor, and not a crisis counselor. It does not provide medical, psychological, or psychiatric care. Never rely on PULSE as a substitute for professional mental health treatment.

### 2. No Liability for Decisions

PULSE may suggest small actions or perspectives, but you remain solely responsible for any decisions you make based on its guidance. To the maximum extent permitted by law, Musab Dawood is not liable for outcomes arising from your use of PULSE's responses.

### 3. Age Requirement

You confirm you are over 18 years old. Accounts and sessions belonging to minors are subject to deletion.

### 4. Acceptable Use

You agree **not** to:

- Submit illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable content.
- Attempt to extract, reverse-engineer, or compromise the underlying system or database.
- Use PULSE to generate content intended to harm yourself or others.
- Spam PULSE with automated requests, scripts, or bots.
- Impersonate the developer or claim ownership of PULSE.

Keyword-based moderation filters run on the input side before messages reach the AI provider. Access may be restricted for violations.

### 5. Description of the Service

- **Free tier** — anonymous chat, limited daily messages (~10/day), the standard empathy engine.
- **Pro tier (planned)** — saved chat history with cloud sync, longer "Deep Dive" sessions, custom personas, and exportable journal summaries.

### 6. Third-Party Processing

Messages are processed by PULSE's third-party large language model provider to generate replies. That provider's own terms and data practices apply to the processing.

### 7. Content Ownership

- What you type remains yours.
- PULSE's branding, name, and underlying code belong to Musab Dawood.
- Responses are provided for your personal use.

### 8. AI Limitations

Responses may be inaccurate, incomplete, or miss emotional nuance. PULSE may misunderstand you. If something it says makes you feel worse, stop and reach out to a real person you trust or a professional.

### 9. Termination

You may stop using PULSE at any time. Access may be restricted for anyone who violates these Terms.

### 10. Changes to These Terms

The most current version is always available here with an updated "last updated" date. Continued use after changes constitutes acceptance.

### 11. Contact

Questions? Email the developer, Musab Dawood: musabdaud007@gmail.com

---

**Last updated:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;
