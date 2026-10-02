// ─── Static Data (Unified Platform) ──────────────────────────────────────────

export const REVIEWS = [];

export const NAV = [
  { id: "admin",      icon: "🛡️",  label: "Admin Panel",   roles: ["admin"] },
  
  // Seeker Nav
  { id: "dashboard",  icon: "⊞",  label: "Dashboard",     roles: ["seeker", "employer"] },
  { id: "jobs",       icon: "💼",  label: "Browse Jobs",   roles: ["seeker"] },
  
  // Employer Nav
  { id: "postjob",    icon: "📝",  label: "Post a Job",    roles: ["employer"] },
  { id: "applicants", icon: "👥",  label: "My Applicants", roles: ["employer"] },
  
  // Shared Nav
  { id: "messages",   icon: "💬",  label: "Messages",      roles: ["seeker", "employer"] },
  { id: "profile",    icon: "👤",  label: "My Profile",    roles: ["seeker", "employer", "admin"] },
  { id: "trust",      icon: "🤖",  label: "Trust Engine",  roles: ["seeker", "employer"] },
];
