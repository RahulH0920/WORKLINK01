import './Legal.css';

export default function PrivacyPolicy({ onNavigate }) {
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
          <div className="legal-badge">🔒 Legal Document</div>
          <h1>Privacy Policy</h1>
          <p className="legal-effective">Effective Date: August 12, 2026 · Last Updated: August 12, 2026</p>
        </div>

        {/* Table of Contents */}
        <div className="legal-toc">
          <h3>Table of Contents</h3>
          <ol>
            <li>Information We Collect</li>
            <li>How We Use Your Information</li>
            <li>Identity Verification Data</li>
            <li>Trust Score Data</li>
            <li>Data Sharing & Disclosure</li>
            <li>Data Security</li>
            <li>Data Retention</li>
            <li>Your Rights</li>
            <li>Children's Privacy</li>
            <li>Changes to This Policy</li>
            <li>Contact Us</li>
          </ol>
        </div>

        {/* 1 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 01</span>
          <h2>Information We Collect</h2>
          <p>We collect information that you provide directly and information generated through your use of the Platform:</p>
          <p><strong>Information You Provide:</strong></p>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, phone number, password, role (seeker/employer)</li>
            <li><strong>Profile Information:</strong> Bio, skills, work experience, profile photo, location</li>
            <li><strong>Verification Documents:</strong> Aadhaar number, PAN number, and associated identity details</li>
            <li><strong>Job-Related Data:</strong> Job postings, applications, reviews, and ratings</li>
            <li><strong>Communications:</strong> Messages exchanged with other users through the Platform</li>
          </ul>
          <p><strong>Information Collected Automatically:</strong></p>
          <ul>
            <li>Device information (browser type, operating system, device identifiers)</li>
            <li>Log data (IP address, access times, pages viewed, actions taken)</li>
            <li>Usage patterns (features used, search queries, interaction frequency)</li>
            <li>Cookie data and similar tracking technologies (see our Cookie Policy)</li>
          </ul>
        </div>

        {/* 2 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 02</span>
          <h2>How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>
          <ul>
            <li><strong>Platform Operations:</strong> To create and manage your account, process applications, and facilitate connections between seekers and employers</li>
            <li><strong>Identity Verification:</strong> To verify your identity using government-issued documents and maintain platform integrity</li>
            <li><strong>Trust Scoring:</strong> To compute and update your trust score using AI algorithms based on your platform activity, ratings, and verification status</li>
            <li><strong>Job Matching:</strong> To match job seekers with relevant opportunities based on skills, location, and preferences</li>
            <li><strong>Communication:</strong> To send you notifications about applications, messages, and platform updates</li>
            <li><strong>Safety & Security:</strong> To detect and prevent fraud, abuse, and unauthorized access</li>
            <li><strong>Platform Improvement:</strong> To analyze usage patterns and improve our features and user experience</li>
          </ul>
        </div>

        {/* 3 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 03</span>
          <h2>Identity Verification Data</h2>
          <p>
            Given the sensitive nature of identity verification data, we apply enhanced protections:
          </p>
          <ul>
            <li><strong>Aadhaar Numbers:</strong> Validated using the Verhoeff algorithm for format verification. We store only the verification status (verified/not verified), not the full Aadhaar number in plain text</li>
            <li><strong>PAN Numbers:</strong> Validated using format-matching regex patterns. Stored in encrypted format with restricted access</li>
            <li>Verification data is processed solely for identity confirmation and is never shared with third parties for marketing purposes</li>
            <li>You may request deletion of your verification documents at any time by contacting our support team</li>
          </ul>
        </div>

        {/* 4 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 04</span>
          <h2>Trust Score Data</h2>
          <p>
            Your trust score is a core feature of WorkLink. Here's how we handle trust-related data:
          </p>
          <ul>
            <li>Trust scores are calculated using a combination of verification status, profile completeness, ratings, job completion rates, and response times</li>
            <li>The scoring algorithm is proprietary, but you can always view your current score and the factors that contribute to it</li>
            <li>Trust scores are visible to other users as part of your public profile</li>
            <li>We do not sell trust score data to third parties</li>
            <li>You can request an explanation of how your trust score was calculated</li>
          </ul>
        </div>

        {/* 5 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 05</span>
          <h2>Data Sharing & Disclosure</h2>
          <p>We do not sell your personal data. We may share your information in the following circumstances:</p>
          <ul>
            <li><strong>With Other Users:</strong> Your public profile information (name, skills, trust score, reviews) is visible to other platform users as necessary for the service to function</li>
            <li><strong>Service Providers:</strong> We may share data with trusted third-party service providers who help us operate the Platform (e.g., cloud hosting, analytics)</li>
            <li><strong>Legal Requirements:</strong> We may disclose your information if required by law, regulation, or legal process</li>
            <li><strong>Safety:</strong> To protect the rights, property, or safety of WorkLink, our users, or the public</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your data may be transferred as part of the transaction</li>
          </ul>
        </div>

        {/* 6 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 06</span>
          <h2>Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal information:
          </p>
          <ul>
            <li>All data transmitted between your browser and our servers is encrypted using TLS/SSL</li>
            <li>Passwords are hashed using bcrypt before storage — we never store plain-text passwords</li>
            <li>Sensitive documents are encrypted at rest</li>
            <li>Access to user data is restricted to authorized personnel on a need-to-know basis</li>
            <li>We conduct regular security audits and vulnerability assessments</li>
          </ul>
          <p>
            While we strive to protect your data, no method of transmission or storage is 100% secure. We cannot guarantee absolute security.
          </p>
        </div>

        {/* 7 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 07</span>
          <h2>Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to provide our services. Specifically:
          </p>
          <ul>
            <li><strong>Account Data:</strong> Retained while your account is active and for up to 12 months after deletion</li>
            <li><strong>Verification Data:</strong> Retained for the duration of your account; deleted within 30 days of account deletion</li>
            <li><strong>Transaction & Job Data:</strong> Retained for up to 3 years for dispute resolution and legal compliance</li>
            <li><strong>Log Data:</strong> Retained for up to 90 days for security and debugging purposes</li>
          </ul>
        </div>

        {/* 8 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 08</span>
          <h2>Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the following rights:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
            <li><strong>Data Portability:</strong> Request a machine-readable copy of your data</li>
            <li><strong>Objection:</strong> Object to certain types of processing of your data</li>
            <li><strong>Withdraw Consent:</strong> Where processing is based on consent, you may withdraw it at any time</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at <strong>privacy@worklink.in</strong>. We will respond to your request within 30 days.
          </p>
        </div>

        {/* 9 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 09</span>
          <h2>Children's Privacy</h2>
          <p>
            WorkLink is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we discover that we have inadvertently collected data from a minor, we will promptly delete it and terminate the associated account.
          </p>
        </div>

        {/* 10 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 10</span>
          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or platform features. We will notify you of material changes through the Platform or via email. Your continued use of the Platform after any changes constitutes your acceptance of the updated policy.
          </p>
        </div>

        {/* Contact */}
        <div className="legal-contact-card">
          <h3>📬 Contact Us</h3>
          <p>
            For privacy-related inquiries, contact our Data Protection Officer at<br />
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
