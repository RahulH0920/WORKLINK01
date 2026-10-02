import './Legal.css';

export default function TermsOfService({ onNavigate }) {
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
          <div className="legal-badge">📄 Legal Document</div>
          <h1>Terms of Service</h1>
          <p className="legal-effective">Effective Date: August 12, 2026 · Last Updated: August 12, 2026</p>
        </div>

        {/* Table of Contents */}
        <div className="legal-toc">
          <h3>Table of Contents</h3>
          <ol>
            <li>Acceptance of Terms</li>
            <li>Description of Service</li>
            <li>User Accounts</li>
            <li>User Responsibilities</li>
            <li>Identity Verification</li>
            <li>Job Postings & Applications</li>
            <li>Trust Score System</li>
            <li>Prohibited Activities</li>
            <li>Intellectual Property</li>
            <li>Limitation of Liability</li>
            <li>Termination</li>
            <li>Changes to Terms</li>
            <li>Contact Us</li>
          </ol>
        </div>

        {/* 1 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 01</span>
          <h2>Acceptance of Terms</h2>
          <p>
            By accessing or using WorkLink ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, you must not access or use the Platform.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you ("User," "you," or "your") and WorkLink ("we," "us," or "our"). By creating an account, posting a job, applying for a gig, or otherwise using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms.
          </p>
        </div>

        {/* 2 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 02</span>
          <h2>Description of Service</h2>
          <p>
            WorkLink is a verified gig economy platform that connects job seekers with employers for part-time, freelance, and short-term employment opportunities. Our platform features:
          </p>
          <ul>
            <li>Identity verification through government-issued documents (Aadhaar and PAN)</li>
            <li>AI-powered trust scoring to promote reliable users</li>
            <li>In-app messaging for secure employer-seeker communication</li>
            <li>Job posting, searching, and application management</li>
            <li>Profile management with skill-based matching</li>
          </ul>
          <p>
            WorkLink acts solely as an intermediary platform. We do not employ job seekers, nor do we guarantee employment, wages, or working conditions. All employment relationships are directly between the employer and the job seeker.
          </p>
        </div>

        {/* 3 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 03</span>
          <h2>User Accounts</h2>
          <p>
            To access most features of the Platform, you must create an account. When creating your account, you agree to:
          </p>
          <ul>
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your account information</li>
            <li>Maintain the security and confidentiality of your login credentials</li>
            <li>Accept responsibility for all activities that occur under your account</li>
            <li>Immediately notify us of any unauthorized use of your account</li>
          </ul>
          <p>
            You must be at least <strong>18 years of age</strong> to create an account and use the Platform. Each user may maintain only one account. Duplicate or fraudulent accounts will be terminated.
          </p>
        </div>

        {/* 4 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 04</span>
          <h2>User Responsibilities</h2>
          <p>As a user of WorkLink, you are responsible for:</p>
          <ul>
            <li>Ensuring all information in your profile and job postings is truthful and accurate</li>
            <li>Treating other users with respect and professionalism</li>
            <li>Complying with all applicable local, state, and national laws and regulations</li>
            <li>Honoring commitments made through the Platform (e.g., showing up for accepted gigs)</li>
            <li>Providing honest reviews and ratings based on genuine experiences</li>
          </ul>
        </div>

        {/* 5 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 05</span>
          <h2>Identity Verification</h2>
          <p>
            WorkLink requires users to verify their identity using government-issued documents. This verification process is central to our platform's trust and safety framework.
          </p>
          <ul>
            <li><strong>Aadhaar Verification:</strong> Users may be required to provide their Aadhaar number for identity verification, validated using algorithmic checks (Verhoeff algorithm)</li>
            <li><strong>PAN Verification:</strong> Users may be required to provide their PAN for additional identity confirmation</li>
            <li>Verified users receive a "Verified" badge and enhanced trust scores</li>
            <li>Submitting fraudulent or falsified documents will result in immediate account termination</li>
          </ul>
          <p>
            By submitting verification documents, you consent to their processing in accordance with our <strong>Privacy Policy</strong>.
          </p>
        </div>

        {/* 6 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 06</span>
          <h2>Job Postings & Applications</h2>
          <p><strong>For Employers:</strong></p>
          <ul>
            <li>Job postings must be accurate, lawful, and non-discriminatory</li>
            <li>You must not post misleading job descriptions or compensation details</li>
            <li>You are responsible for complying with all applicable employment laws</li>
            <li>WorkLink reserves the right to remove any job posting that violates these Terms</li>
          </ul>
          <p><strong>For Job Seekers:</strong></p>
          <ul>
            <li>Applications should be genuine and reflect your actual skills and availability</li>
            <li>You should not apply for jobs you have no intention of fulfilling</li>
            <li>Failure to show up for accepted gigs may negatively affect your trust score</li>
          </ul>
        </div>

        {/* 7 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 07</span>
          <h2>Trust Score System</h2>
          <p>
            WorkLink uses an AI-powered trust scoring system to promote reliability and safety. Your trust score is calculated based on:
          </p>
          <ul>
            <li>Verification status (identity document verification)</li>
            <li>Profile completeness (photo, bio, skills, experience)</li>
            <li>Job completion rate and reliability</li>
            <li>Ratings and reviews from other users</li>
            <li>Response time and communication quality</li>
          </ul>
          <p>
            Trust scores are dynamically updated and may affect your visibility in search results and job recommendations. Manipulation or gaming of the trust score system is prohibited and may result in account suspension.
          </p>
        </div>

        {/* 8 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 08</span>
          <h2>Prohibited Activities</h2>
          <p>You agree not to engage in any of the following activities:</p>
          <ul>
            <li>Using the Platform for any illegal or unauthorized purpose</li>
            <li>Impersonating another person or entity</li>
            <li>Submitting false, misleading, or fraudulent information</li>
            <li>Harassing, abusing, or threatening other users</li>
            <li>Attempting to circumvent the Platform's security measures</li>
            <li>Scraping, crawling, or automated data collection from the Platform</li>
            <li>Posting spam, unsolicited advertisements, or promotional content</li>
            <li>Creating multiple accounts to manipulate trust scores or reviews</li>
            <li>Using the Platform to facilitate off-platform transactions to avoid accountability</li>
          </ul>
        </div>

        {/* 9 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 09</span>
          <h2>Intellectual Property</h2>
          <p>
            All content, features, and functionality of the Platform — including but not limited to the design, text, graphics, logos, icons, software, and trust scoring algorithms — are the exclusive property of WorkLink and are protected by intellectual property laws.
          </p>
          <p>
            You may not reproduce, distribute, modify, create derivative works of, publicly display, or in any way exploit any of our content without our prior written consent.
          </p>
        </div>

        {/* 10 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 10</span>
          <h2>Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, WorkLink shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, use, goodwill, or other intangible losses resulting from:
          </p>
          <ul>
            <li>Your access to or use of (or inability to access or use) the Platform</li>
            <li>Any conduct or content of any third party on the Platform</li>
            <li>Unauthorized access, use, or alteration of your transmissions or content</li>
            <li>Any disputes between employers and job seekers</li>
          </ul>
          <p>
            WorkLink does not guarantee continuous, uninterrupted, or secure access to the Platform. Operation of the Platform may be affected by factors outside our control.
          </p>
        </div>

        {/* 11 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 11</span>
          <h2>Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we determine, in our sole discretion, violates these Terms or is harmful to the Platform, its users, or third parties.
          </p>
          <p>
            Upon termination, your right to use the Platform will immediately cease. Any provisions of these Terms that by their nature should survive termination shall survive (including, without limitation, ownership provisions, warranty disclaimers, and limitations of liability).
          </p>
        </div>

        {/* 12 */}
        <div className="legal-section">
          <span className="legal-section-number">SECTION 12</span>
          <h2>Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. If we make material changes, we will notify you through the Platform or via the email address associated with your account. Your continued use of the Platform after such modifications constitutes your acceptance of the updated Terms.
          </p>
        </div>

        {/* 13 - Contact */}
        <div className="legal-contact-card">
          <h3>📬 Contact Us</h3>
          <p>
            If you have any questions about these Terms of Service, please contact us at<br />
            <a href="mailto:legal@worklink.in">legal@worklink.in</a>
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
