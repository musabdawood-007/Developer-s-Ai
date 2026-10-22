export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: September 10, 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">1. Introduction</h2>
            <p>
              PULSE (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our service available at{" "}
              <a href="https://pulse-bot-ai.vercel.app" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-foreground hover:text-foreground">
                pulse-bot-ai.vercel.app
              </a>.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">2. Information We Collect</h2>
            <div className="space-y-2">
              <p><span className="font-medium text-foreground">Account Information:</span> When you create an account, we collect your name, email address, and a hashed version of your password. We do not store your plain-text password.</p>
              <p><span className="font-medium text-foreground">Chat Data:</span> Your conversations are stored locally in your browser using localStorage — we cannot read, transmit, or recover them. However, to generate a reply, each message you send is transmitted to our AI provider for processing. Do not share information you are not comfortable sending to an AI provider.</p>
              <p><span className="font-medium text-foreground">Usage Data:</span> Daily message counts (used to enforce the free-tier limit), anonymous thumbs-up/down feedback, and basic usage metadata. This data cannot be linked to the content of your conversations.</p>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Provide and maintain the Service</li>
              <li>Authenticate your account and prevent unauthorized access</li>
              <li>Communicate with you about updates, security alerts, or support</li>
              <li>Improve and optimize the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">4. Data Storage and Security</h2>
            <div className="space-y-2">
              <p><span className="font-medium text-foreground">Local Storage:</span> All your chat messages and session data are stored exclusively in your browser&apos;s localStorage. This data never leaves your device. We cannot access, read, or recover your conversations.</p>
              <p><span className="font-medium text-foreground">Server Storage:</span> Only your account credentials (name, email, hashed password) are stored on our secure servers. Chat content is never sent to or stored on our servers.</p>
              <p><span className="font-medium text-foreground">Encryption:</span> We use industry-standard encryption (HTTPS/TLS) for all data transmission. Passwords are hashed using secure hashing algorithms.</p>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">5. Third-Party Services</h2>
            <p>
              The Service uses third-party AI models and APIs to generate responses. Your chat messages are processed by these AI services to generate responses. These third-party services are subject to their own privacy policies. We do not control how these services handle data after processing.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">6. Cookies and Tracking</h2>
            <p>
              We use essential cookies only for authentication sessions. We do not use tracking cookies, advertising cookies, or third-party analytics that personally identify you.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li><span className="font-medium text-foreground">Access:</span> Request a copy of the personal data we hold about you</li>
              <li><span className="font-medium text-foreground">Delete:</span> Request deletion of your account and all associated data</li>
              <li><span className="font-medium text-foreground">Export:</span> Request an export of your account data</li>
              <li><span className="font-medium text-foreground">Local Data:</span> Clear all your chat data at any time by clearing your browser&apos;s localStorage or signing out</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">8. Age Requirement</h2>
            <p>
              PULSE requires users to confirm they are over 18 years old. The Service is not directed at children under 18 and is not structured to comply with children&apos;s-data regulations (COPPA/GDPR-K). If you believe a minor has used the Service, please contact us so the account can be removed.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated &quot;Last updated&quot; date. Your continued use of the Service after any changes constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy,{" "}
              <a href="https://musab-007.netlify.app" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-muted-foreground/50 hover:text-foreground transition-colors">
                click here
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} PULSE. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
