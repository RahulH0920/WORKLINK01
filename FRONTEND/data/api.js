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
    const err = new Error(data.message || 'Something went wrong');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

/* ── Auth endpoints ── */

export async function registerUser({ firstName, lastName, email, phone, password, role }) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName, lastName, email, phone, password, role }),
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
  // sync localStorage with updated user
  const stored = getStoredUser();
  if (stored) {
    stored.profileComplete = true;
    stored.documentsUploaded = true;
    localStorage.setItem('wl_user', JSON.stringify(stored));
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

export async function getPendingVerifications() {
  return request('/admin/pending-verifications');
}

export async function verifyUserDocument(userId, action) {
  return request(`/admin/verify/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

/* ── Document Verification (Cashfree Integration) ── */

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

export async function applyJob(jobId) {
  return request(`/jobs/${jobId}/apply`, {
    method: 'POST',
  });
}
