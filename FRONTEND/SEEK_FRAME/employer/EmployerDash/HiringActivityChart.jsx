import React, { useState, useMemo } from 'react';
import './HiringActivityChart.css';

export default function HiringActivityChart({ jobs = [] }) {
  const [filter, setFilter] = useState('30days'); // '7days' | '30days' | '6months'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Compute time intervals and data points from real jobs & applications
  const chartData = useMemo(() => {
    const now = new Date();
    let buckets = [];

    if (filter === '7days') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = d.toISOString().split('T')[0];
        buckets.push({
          label: dayLabel,
          dateStr,
          timestamp: d.getTime(),
          jobs: 0,
          applications: 0,
          hired: 0,
        });
      }
    } else if (filter === '30days') {
      // 6 intervals over last 30 days (every 5 days)
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 5);
        const label = `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
        const dateStr = d.toISOString().split('T')[0];
        buckets.push({
          label,
          dateStr,
          timestamp: d.getTime(),
          jobs: 0,
          applications: 0,
          hired: 0,
        });
      }
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        buckets.push({
          label,
          timestamp: d.getTime(),
          monthYear: `${d.getFullYear()}-${d.getMonth()}`,
          jobs: 0,
          applications: 0,
          hired: 0,
        });
      }
    }

    // Populate with real data
    jobs.forEach(j => {
      const jobTime = j.createdAt ? new Date(j.createdAt).getTime() : now.getTime();
      
      // Match to bucket
      buckets.forEach((b, idx) => {
        const nextBucketTime = idx < buckets.length - 1 ? buckets[idx + 1].timestamp : Infinity;
        if (jobTime >= b.timestamp && jobTime < nextBucketTime) {
          b.jobs += 1;
        }
      });

      // Count applications
      if (Array.isArray(j.applications)) {
        j.applications.forEach(app => {
          const appTime = app.appliedAt ? new Date(app.appliedAt).getTime() : jobTime;
          buckets.forEach((b, idx) => {
            const nextBucketTime = idx < buckets.length - 1 ? buckets[idx + 1].timestamp : Infinity;
            if (appTime >= b.timestamp && appTime < nextBucketTime) {
              b.applications += 1;
              if (app.status === 'accepted' || app.status === 'hired') {
                b.hired += 1;
              }
            }
          });
        });
      }
    });

    // Return real employer buckets directly without manufactured baseline values
    return buckets;
  }, [jobs, filter]);

  // SVG Chart Geometry
  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 24, bottom: 32, left: 32 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    5,
    ...chartData.map(d => Math.max(d.jobs, d.applications, d.hired))
  );

  const getX = (idx) => padding.left + (idx / (chartData.length - 1)) * graphWidth;
  const getY = (val) => padding.top + graphHeight - (val / maxVal) * graphHeight;

  // Build SVG path
  const createSmoothPath = (values) => {
    if (values.length === 0) return '';
    const points = values.map((val, idx) => ({ x: getX(idx), y: getY(val) }));
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const appsPath = createSmoothPath(chartData.map(d => d.applications));
  const jobsPath = createSmoothPath(chartData.map(d => d.jobs));
  const hiredPath = createSmoothPath(chartData.map(d => d.hired));

  // Area under applications curve
  const appsArea = `${appsPath} L ${getX(chartData.length - 1)} ${padding.top + graphHeight} L ${getX(0)} ${padding.top + graphHeight} Z`;

  return (
    <div className="hiring-chart-card">
      <div className="chart-header-row">
        <div>
          <div className="chart-title-wrap">
            <h3 className="chart-title">Hiring Activity</h3>
            <span className="chart-live-badge">● Live Metric</span>
          </div>
          <p className="chart-subtitle">Trends for listings posted, candidate applications, and workers hired</p>
        </div>

        <div className="chart-filters-group">
          <button
            type="button"
            className={`chart-filter-btn ${filter === '7days' ? 'active' : ''}`}
            onClick={() => setFilter('7days')}
          >
            7 Days
          </button>
          <button
            type="button"
            className={`chart-filter-btn ${filter === '30days' ? 'active' : ''}`}
            onClick={() => setFilter('30days')}
          >
            30 Days
          </button>
          <button
            type="button"
            className={`chart-filter-btn ${filter === '6months' ? 'active' : ''}`}
            onClick={() => setFilter('6months')}
          >
            6 Months
          </button>
        </div>
      </div>

      {/* Legend Indicators */}
      <div className="chart-legend-row">
        <div className="legend-item">
          <span className="legend-dot dot-applications" />
          <span className="legend-label">Applications</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-jobs" />
          <span className="legend-label">Jobs Posted</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-hired" />
          <span className="legend-label">Hired Workers</span>
        </div>
      </div>

      {/* SVG Responsive Graph */}
      <div className="chart-svg-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="hiring-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="appsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padding.top + graphHeight * ratio;
            return (
              <line
                key={i}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray={ratio === 1 ? 'none' : '4 4'}
              />
            );
          })}

          {/* Area fill */}
          <path d={appsArea} fill="url(#appsGradient)" />

          {/* Lines */}
          <path
            d={appsPath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={jobsPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5 3"
          />
          <path
            d={hiredPath}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {chartData.map((d, idx) => {
            const x = getX(idx);
            const isHovered = hoveredIndex === idx;

            return (
              <g key={idx} onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}>
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + graphHeight}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Applications circle */}
                <circle
                  cx={x}
                  cy={getY(d.applications)}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth={isHovered ? 3 : 2}
                  className="chart-node"
                />

                {/* Jobs circle */}
                <circle
                  cx={x}
                  cy={getY(d.jobs)}
                  r={isHovered ? 5 : 3.5}
                  fill="#ffffff"
                  stroke="#10b981"
                  strokeWidth="2"
                  className="chart-node"
                />

                {/* Hired circle */}
                <circle
                  cx={x}
                  cy={getY(d.hired)}
                  r={isHovered ? 5 : 3.5}
                  fill="#ffffff"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  className="chart-node"
                />

                {/* X-axis Label */}
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  className={`chart-axis-label ${isHovered ? 'active' : ''}`}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && chartData[hoveredIndex] && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(getX(hoveredIndex) / width) * 100}%`,
            }}
          >
            <div className="tooltip-date">{chartData[hoveredIndex].label}</div>
            <div className="tooltip-row">
              <span className="tooltip-badge dot-applications" />
              <span>Applications:</span>
              <strong>{chartData[hoveredIndex].applications}</strong>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-badge dot-jobs" />
              <span>Jobs Posted:</span>
              <strong>{chartData[hoveredIndex].jobs}</strong>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-badge dot-hired" />
              <span>Hired Workers:</span>
              <strong>{chartData[hoveredIndex].hired}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
