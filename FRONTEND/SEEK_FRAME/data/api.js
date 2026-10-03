/* ── WorkLink API client ── */

const API_BASE = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('wl_token');

  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMsg = data.message || (data.errors && data.errors.length > 0 ? data.errors.map(e => e.msg).join(', ') : 'Something went wrong');
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/* ── Auth endpoints ── */

export async function registerUser({ name, firstName, lastName, email, phone, password, role }) {
  const resolvedName = (name || `${firstName || ''} ${lastName || ''}`).trim();
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: resolvedName, email, phone, password, role }),
  });

  // persist token
  localStorage.setItem('wl_token', data.token);
  localStorage.setItem('wl_user', JSON.stringify(data.user));

  return data;
}

export async function loginUser({ email, password }) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem('wl_token', data.token);
  localStorage.setItem('wl_user', JSON.stringify(data.user));

  return data;
}

export async function getMe() {
  return request('/auth/me');
}

export function logoutUser() {
  localStorage.removeItem('wl_token');
  localStorage.removeItem('wl_user');
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('wl_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredToken() {
  return localStorage.getItem('wl_token');
}

/* ── Profile endpoints ── */

export async function updateBio(bio, location) {
  const body = { bio };
  if (location !== undefined) body.location = location;

  const data = await request('/profile/bio', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  // sync localStorage
  const stored = getStoredUser();
  if (stored) {
    stored.bio = data.user.bio;
    if (data.user.location) stored.location = data.user.location;
    localStorage.setItem('wl_user', JSON.stringify(stored));
  }
  return data;
}

export async function updateSkills(skills) {
  const data = await request('/profile/skills', {
    method: 'PUT',
    body: JSON.stringify({ skills }),
  });
  const stored = getStoredUser();
  if (stored) {
    stored.skills = data.user.skills;
    localStorage.setItem('wl_user', JSON.stringify(stored));
  }
  return data;
}

export async function completeProfile(formData) {
  const data = await request('/profile/complete', {
    method: 'POST',
    body: formData,
  });
  // sync localStorage with full updated user
  if (data.user) {
    localStorage.setItem('wl_user', JSON.stringify(data.user));
  }
  return data;
}

export async function getProfile() {
  return request('/profile');
}

/* ── Public stats (no auth required) ── */

export async function getPlatformStats() {
  const data = await request('/stats');
  return data.stats;
}

/* ── Admin endpoints ── */

export async function getAdminTransactions() {
  return request('/admin/transactions');
}

export async function getAdminJobs() {
  return request('/admin/jobs');
}

export async function getAdminApplications() {
  return request('/admin/applications');
}

export async function getAdminEmployers() {
  return request('/admin/employers');
}

export async function getFraudAlerts() {
  return request('/admin/fraud/alerts');
}

export async function updateFraudAlertStatus(alertId, status, note, riskLevel) {
  return request(`/admin/fraud/alerts/${alertId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, note, riskLevel }),
  });
}

export async function getTrustSafetyData() {
  return request('/admin/trust-safety');
}

export async function updateSafetyIssueStatus(issueId, status, note, severity) {
  return request(`/admin/trust-safety/issues/${issueId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, note, severity }),
  });
}

export async function getPendingVerifications() {
  return request('/admin/pending-verifications');
}

export async function getVerificationDetails(userId) {
  return request(`/admin/verification-details/${userId}`);
}

export async function fetchAdminDocumentBlob(userId, docType) {
  const token = localStorage.getItem('wl_token');
  const res = await fetch(`${API_BASE}/admin/document/${userId}/${docType}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to load document (${res.status})`);
  }

  return res.blob();
}

export async function verifyUserDocument(userId, action, reason) {
  return request(`/admin/verify/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ action, reason }),
  });
}

/* ── Document Verification & OCR ── */

export async function runDocumentOCR(formData) {
  return request('/verify/ocr', {
    method: 'POST',
    body: formData,
  });
}

export async function fetchAadhaarDetails(aadhaarNumber) {
  const cleaned = (aadhaarNumber || '').replace(/[\s-]/g, '');
  return request(`/verify/fetch-aadhaar/${cleaned}`, {
    method: 'GET',
  });
}

export async function sendAadhaarOTP(aadhaarNumber) {
  return request('/verify/aadhaar/send-otp', {
    method: 'POST',
    body: JSON.stringify({ aadhaarNumber }),
  });
}

export async function verifyAadhaarOTP(refId, otp) {
  return request('/verify/aadhaar/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ refId, otp }),
  });
}

export async function verifyPAN(panNumber) {
  return request('/verify/pan', {
    method: 'POST',
    body: JSON.stringify({ panNumber }),
  });
}

export async function verifyFaceMatch(aadhaarPhotoBase64, selfieFile) {
  const formData = new FormData();
  formData.append('aadhaarPhoto', aadhaarPhotoBase64);
  formData.append('photo', selfieFile);

  return request('/verify/face-match', {
    method: 'POST',
    body: formData,
  });
}

/* ── Jobs ── */

export async function createJob(jobData) {
  return request('/jobs', {
    method: 'POST',
    body: JSON.stringify(jobData),
  });
}

export async function getJobs() {
  return request('/jobs', {
    method: 'GET',
  });
}

export async function updateJob(jobId, jobData) {
  return request(`/jobs/${jobId}`, {
    method: 'PUT',
    body: JSON.stringify(jobData),
  });
}

export async function deleteJob(jobId) {
  return request(`/jobs/${jobId}`, {
    method: 'DELETE',
  });
}

export async function applyJob(jobId) {
  return request(`/jobs/${jobId}/apply`, {
    method: 'POST',
  });
}

export async function updateApplicationStatus(jobId, applicantId, status) {
  return request(`/jobs/${jobId}/applications/${applicantId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function getMyApplications() {
  return request('/jobs/my-applications', {
    method: 'GET',
  });
}

/* ── Step 12E: Job Completion Confirmation APIs ── */

export async function markWorkCompleted(jobId) {
  return request(`/jobs/${jobId}/mark-completed`, {
    method: 'POST',
  });
}

export async function confirmJobCompletion(jobId) {
  return request(`/jobs/${jobId}/confirm-completion`, {
    method: 'POST',
  });
}

export async function raiseJobIssue(jobId, reason) {
  return request(`/jobs/${jobId}/raise-issue`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/* ── Step 12F & 12G: Remaining Payment & Final Receipts APIs ── */

export async function payRemainingPayment(jobId) {
  return request(`/jobs/${jobId}/pay-remaining`, {
    method: 'POST',
  });
}

export async function getJobTransaction(jobId) {
  return request(`/jobs/${jobId}/transaction`, {
    method: 'GET',
  });
}

/* ── Step 12H & 12I: Worker Earnings & Employer Payment History APIs ── */

export async function getWorkerEarnings() {
  return request('/jobs/worker/earnings', {
    method: 'GET',
  });
}

export async function getEmployerPayments() {
  return request('/jobs/employer/payments', {
    method: 'GET',
  });
}

/* ── Trust Score, Performance Ratings & Reviews APIs ── */

export async function getTrustHistory() {
  return request('/profile/trust-history', {
    method: 'GET',
  });
}

export async function getWorkerReviews() {
  return request('/profile/reviews', {
    method: 'GET',
  });
}

export async function getWorkerPublicProfile(workerId) {
  return request(`/profile/worker/${workerId}`, {
    method: 'GET',
  });
}

export async function rateWorkerPerformance(jobId, rating, review) {
  return request(`/jobs/${jobId}/rate-worker`, {
    method: 'POST',
    body: JSON.stringify({ rating, review }),
  });
}

export async function getJobWorkerReview(jobId) {
  return request(`/jobs/${jobId}/worker-review`, {
    method: 'GET',
  });
}

export async function adminAdjustTrustScore(workerId, reason, adjustment, jobId, transactionId) {
  return request(`/admin/workers/${workerId}/adjust-trust-score`, {
    method: 'POST',
    body: JSON.stringify({ reason, adjustment, jobId, transactionId }),
  });
}

/* ── Worker Profile, Photo & Settings APIs ── */

export async function uploadProfilePhoto(file) {
  const formData = new FormData();
  formData.append('photo', file);
  return request('/profile/photo', {
    method: 'POST',
    body: formData,
  });
}

export async function removeProfilePhoto() {
  return request('/profile/photo', {
    method: 'DELETE',
  });
}

export async function updateProfileDetails(details) {
  return request('/profile/details', {
    method: 'PUT',
    body: JSON.stringify(details),
  });
}

export async function getNotificationPreferences() {
  return request('/profile/notifications', {
    method: 'GET',
  });
}

export async function updateNotificationPreferences(preferences) {
  return request('/profile/notifications', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });
}

export async function updateWorkPreferences(workPreferences) {
  return request('/profile/work-preferences', {
    method: 'PUT',
    body: JSON.stringify(workPreferences),
  });
}

export async function getWorkerStats() {
  return request('/profile/stats', {
    method: 'GET',
  });
}

export async function changePassword(currentPassword, newPassword, confirmPassword) {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
}

export async function changePhone(newPhone) {
  return request('/auth/change-phone', {
    method: 'POST',
    body: JSON.stringify({ newPhone }),
  });
}

export async function changeEmail(newEmail) {
  return request('/auth/change-email', {
    method: 'POST',
    body: JSON.stringify({ newEmail }),
  });
}

export async function deactivateAccount() {
  return request('/auth/deactivate', {
    method: 'POST',
  });
}

// ==================== ADMIN NOTIFICATIONS & REPORTS ====================

export async function getAdminNotifications(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/admin/notifications${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}

export async function markAdminNotificationRead(notificationId, isRead = true) {
  return request(`/admin/notifications/${notificationId}/read`, {
    method: 'POST',
    body: JSON.stringify({ isRead }),
  });
}

export async function markAllAdminNotificationsRead() {
  return request('/admin/notifications/mark-all-read', {
    method: 'POST',
  });
}

export async function dismissAdminNotification(notificationId) {
  return request(`/admin/notifications/${notificationId}`, {
    method: 'DELETE',
  });
}

export async function getAdminReports(timeframe = 'all') {
  return request(`/admin/reports?timeframe=${encodeURIComponent(timeframe)}`, {
    method: 'GET',
  });
}

export async function getAdminAuditLogs() {
  return request('/admin/audit-logs', {
    method: 'GET',
  });
}




