import './Stars.css';

export default function Stars({ n }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="star" style={{ color: i <= n ? "#FFB547" : "#E5E8EF" }}>★</span>
      ))}
    </div>
  );
}
