import './StatusPill.css';

const CLASS_MAP = {
  hired: "pill-green",
  shortlisted: "pill-blue",
  pending: "pill-amber",
  rejected: "pill-red",
  active: "pill-green",
  completed: "pill-green",
  closed: "pill-gray",
  verified: "pill-green",
  pending_verif: "pill-amber",
};

const LABEL_MAP = {
  pending_verif: "Pending",
};

export default function StatusPill({ s }) {
  const label = LABEL_MAP[s] || s.charAt(0).toUpperCase() + s.slice(1);
  return <span className={`pill ${CLASS_MAP[s] || "pill-gray"}`}>{label}</span>;
}
