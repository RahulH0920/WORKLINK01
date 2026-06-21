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
