import './Legal.css';

export default function CookiePolicy({ onNavigate }) {
  return (
    <div className="legal-page">
      {/* ── Background orbs ── */}
      <div className="legal-orbs" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      {/* ── Navbar ── */}
      <nav className="legal-nav">
        <div className="logo" style={{ padding: 0, border: 'none', cursor: 'pointer' }} onClick={() => onNavigate('landing')}>
          <div className="logo-mark">W</div>
          <span className="logo-text" style={{ color: 'var(--ink)' }}>WorkLink</span>
        </div>
        <button className="btn btn-ghost" onClick={() => onNavigate('landing')}>← Back to Home</button>
      </nav>

      {/* ── Content ── */}
      <div className="legal-content">
        <div className="legal-header">
          <div className="legal-badge">🍪 Legal Document</div>
          <h1>Cookie Policy</h1>
          <p className="legal-effective">Effective Date: August 12, 2026 · Last Updated: August 12, 2026</p>
        </div>

        {/* Table of Contents */}
        <div className="legal-toc">
          <h3>Table of Contents</h3>
          <ol>
            <li>What Are Cookies</li>
            <li>How We Use Cookies</li>
            <li>Types of Cookies We Use</li>
            <li>Cookie Details</li>
            <li>Third-Party Cookies</li>
            <li>Managing Your Cookie Preferences</li>
            <li>Impact of Disabling Cookies</li>
            <li>Changes to This Policy</li>
            <li>Contact Us</li>
          </ol>
        </div>

        {/* 1 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 01</span>
          <h2>What Are Cookies</h2>
          <p>
            Cookies are small text files that are placed on your device (computer, tablet, or mobile phone) when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and give website owners useful information.
          </p>
          <p>
            Cookies can be "persistent" (remaining on your device until they expire or you delete them) or "session" cookies (deleted when you close your browser). They can be set by the website you are visiting ("first-party cookies") or by third parties ("third-party cookies").
          </p>
        </div>

        {/* 2 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 02</span>
          <h2>How We Use Cookies</h2>
          <p>WorkLink uses cookies and similar technologies for the following purposes:</p>
          <ul>
            <li><strong>Authentication:</strong> To keep you signed in and maintain your session as you navigate the Platform</li>
            <li><strong>Security:</strong> To help protect your account from unauthorized access and detect suspicious activity</li>
            <li><strong>Preferences:</strong> To remember your settings and preferences (e.g., theme, notification preferences)</li>
            <li><strong>Analytics:</strong> To understand how users interact with the Platform and identify areas for improvement</li>
            <li><strong>Performance:</strong> To optimize Platform speed and responsiveness</li>
          </ul>
        </div>

        {/* 3 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 03</span>
          <h2>Types of Cookies We Use</h2>
          
          <p><strong>🟢 Strictly Necessary Cookies</strong></p>
          <p>
            These cookies are essential for the Platform to function properly. They enable core functionality such as user authentication, session management, and security features. Without these cookies, the Platform cannot operate. These cookies do not require your consent.
          </p>

          <p><strong>🔵 Functional Cookies</strong></p>
          <p>
            These cookies enable enhanced functionality and personalization. They remember your preferences (such as role selection, display settings) and provide features that improve your experience. Disabling these cookies may affect some Platform features.
          </p>

          <p><strong>🟡 Analytics Cookies</strong></p>
          <p>
            These cookies help us understand how visitors interact with the Platform by collecting and reporting information anonymously. This data helps us improve the Platform's performance, content, and user experience.
          </p>
        </div>

        {/* 4 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 04</span>
          <h2>Cookie Details</h2>
          <p>Below is a detailed list of cookies used on WorkLink:</p>
          
          <p><strong>Strictly Necessary:</strong></p>
          <ul>
            <li><strong>wl_token</strong> — Authentication token for maintaining your logged-in session. Type: Local Storage. Duration: Until logout</li>
            <li><strong>wl_user</strong> — Cached user profile data for fast page loads. Type: Local Storage. Duration: Until logout</li>
          </ul>

          <p><strong>Functional:</strong></p>
          <ul>
            <li><strong>wl_theme</strong> — Stores your preferred theme setting (light/dark). Type: Local Storage. Duration: Persistent</li>
            <li><strong>wl_sidebar</strong> — Remembers sidebar collapse/expand state. Type: Local Storage. Duration: Persistent</li>
          </ul>

          <p><strong>Analytics:</strong></p>
          <ul>
            <li><strong>wl_analytics</strong> — Anonymous usage analytics for Platform improvement. Type: Cookie. Duration: 90 days</li>
          </ul>
        </div>

        {/* 5 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 05</span>
          <h2>Third-Party Cookies</h2>
          <p>
            WorkLink may use limited third-party services that set their own cookies. Currently, we use:
          </p>
          <ul>
            <li><strong>No third-party advertising cookies:</strong> WorkLink does not use any advertising or retargeting cookies</li>
            <li><strong>Hosting Services:</strong> Our hosting provider may set standard security cookies to protect against DDoS attacks and malicious traffic</li>
          </ul>
          <p>
            We carefully vet all third-party services and only partner with providers who respect user privacy. We do not allow any third party to use cookies for advertising purposes on our Platform.
          </p>
        </div>

        {/* 6 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 06</span>
          <h2>Managing Your Cookie Preferences</h2>
          <p>You have several options for managing cookies:</p>
          <ul>
            <li><strong>Browser Settings:</strong> Most web browsers allow you to control cookies through their settings. You can typically find these under "Privacy" or "Security" settings in your browser's menu</li>
            <li><strong>Delete Cookies:</strong> You can delete existing cookies at any time through your browser settings</li>
            <li><strong>Block Cookies:</strong> You can set your browser to block all cookies or only third-party cookies</li>
            <li><strong>Clear Local Storage:</strong> You can clear Local Storage data through your browser's developer tools (typically F12 → Application → Local Storage)</li>
          </ul>
          <p><strong>Popular browser cookie management links:</strong></p>
          <ul>
            <li>Google Chrome: Settings → Privacy and Security → Cookies</li>
            <li>Mozilla Firefox: Settings → Privacy & Security → Cookies</li>
            <li>Safari: Preferences → Privacy → Cookies</li>
            <li>Microsoft Edge: Settings → Privacy → Cookies</li>
          </ul>
        </div>

        {/* 7 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 07</span>
          <h2>Impact of Disabling Cookies</h2>
          <p>
            If you choose to disable or delete cookies, please be aware of the following impacts:
          </p>
          <ul>
            <li><strong>Authentication cookies:</strong> Disabling these will prevent you from staying logged in. You will need to re-enter your credentials on each visit</li>
            <li><strong>Functional cookies:</strong> Your preferences (theme, sidebar state) will not be remembered between sessions</li>
            <li><strong>Analytics cookies:</strong> Disabling these will not affect your experience but will prevent us from improving the Platform based on aggregated usage data</li>
          </ul>
          <p>
            Strictly necessary cookies cannot be disabled as they are required for the Platform to function. All other cookies can be managed through your browser settings.
          </p>
        </div>

        {/* 8 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 08</span>
          <h2>Changes to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in our cookie usage or for legal and regulatory reasons. When we make changes, we will update the "Last Updated" date at the top of this page and, for significant changes, notify you through the Platform.
          </p>
          <p>
            We recommend checking this page periodically to stay informed about our use of cookies.
          </p>
        </div>

        {/* Contact */}
        <div className="legal-contact-card">
          <h3>📬 Contact Us</h3>
          <p>
            If you have any questions about our use of cookies, please contact us at<br />
            <a href="mailto:privacy@worklink.in">privacy@worklink.in</a>
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="legal-footer">
        © 2026 WorkLink. All rights reserved. · Made with 💚 in India
      </footer>
    </div>
  );
}
