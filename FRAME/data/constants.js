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
