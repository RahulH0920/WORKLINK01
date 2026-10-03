// ─── Static Data ─────────────────────────────────────────────────────────────

export const REVIEWS = [];

export const NAV = [
  { id:"admin",      icon:"🛡️",  label:"Admin Panel",     roles:["admin"] },
  { id:"dashboard",  icon:"⊞",  label:"Dashboard",       roles:["seeker","employer"] },
  { id:"jobs",       icon:"💼",  label:"Browse Jobs",     roles:["seeker"] },
  { id:"postjob",    icon:"📝",  label:"Post a Job",      roles:["employer"] },
  { id:"applicants", icon:"👥",  label:"My Applicants",   roles:["employer"] },
  { id:"messages",   icon:"💬",  label:"Messages",        roles:["seeker","employer"] },
  { id:"profile",    icon:"👤",  label:"My Profile",      roles:["seeker","employer","admin"] },
  { id:"trust",      icon:"🤖",  label:"Trust Engine",    roles:["seeker"] },
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

