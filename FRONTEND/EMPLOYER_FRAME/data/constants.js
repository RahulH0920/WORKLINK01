// ─── Static Data ─────────────────────────────────────────────────────────────

export const JOBS = [];

export const APPLICANTS = [];

export const PENDING_VERIF = [];

export const REVIEWS = [];

export const NAV = [
  { id:"admin",      icon:"🛡️",  label:"Admin Panel",   roles:["admin"] },
  { id:"dashboard",  icon:"⊞",  label:"Dashboard",    roles:["seeker"] },
  { id:"jobs",       icon:"💼",  label:"Browse Jobs",   roles:["seeker"] },
  { id:"messages",   icon:"💬",  label:"Messages",      roles:["seeker"] },
  { id:"profile",    icon:"👤",  label:"My Profile",    roles:["seeker","admin"] },
  { id:"trust",      icon:"🤖",  label:"Trust Engine",  roles:["seeker"] },
];

export const DEPARTMENTS = [
  { id: 'Catering', label: 'Catering', icon: '🍽️', description: 'Food service, kitchen staff & event hospitality' },
  { id: 'Driving',  label: 'Driving',  icon: '🚗', description: 'Chauffeur, cab, delivery & transport driving' },
  { id: 'Cleaning', label: 'Cleaning', icon: '🧹', description: 'Housekeeping, deep cleaning & sanitation' },
  { id: 'Delivery', label: 'Delivery', icon: '📦', description: 'Courier, parcel delivery & logistics' },
];

export const DEPARTMENT_MAP = DEPARTMENTS.reduce((acc, d) => {
  acc[d.id] = d;
  return acc;
}, {});

