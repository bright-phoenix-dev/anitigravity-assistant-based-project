'use client';
export default function ProgressRing({
  progress = 0,
  size = 120,
  strokeWidth = 8,
  label = '',
  sublabel = '',
}) {
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedProgress / 100) * circumference;
  let strokeColor = '#10b981'; // Green (on track)
  if (normalizedProgress > 80) strokeColor = '#f59e0b'; // Warning
  if (normalizedProgress > 100) strokeColor = '#ef4444'; // Danger
  return (
    <div
      className="progress-ring-container"
      role="progressbar"
      aria-valuenow={normalizedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${normalizedProgress}% of goal`}
    >
      <svg aria-label="Graphic"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="progress-ring-svg"
      >
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(75, 85, 99, 0.2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={normalizedProgress <= 80 ? 'url(#progressGradient)' : strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s ease',
          }}
        />
      </svg>
      <div className="progress-ring-content">
        <span className="progress-ring-value">
          {normalizedProgress.toFixed(0)}%
        </span>
        {label && <span className="progress-ring-label">{label}</span>}
        {sublabel && <span className="progress-ring-sublabel">{sublabel}</span>}
      </div>
      <style jsx>{`
        .progress-ring-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: ${size}px;
          height: ${size}px;
        }
        .progress-ring-svg {
          position: absolute;
          top: 0;
          left: 0;
        }
        .progress-ring-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 1;
        }
        .progress-ring-value {
          font-size: ${size * 0.2}px;
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1;
        }
        .progress-ring-label {
          font-size: ${Math.max(size * 0.09, 10)}px;
          color: var(--color-text-secondary);
          margin-top: 2px;
          text-align: center;
        }
        .progress-ring-sublabel {
          font-size: ${Math.max(size * 0.075, 9)}px;
          color: var(--color-text-muted);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
ProgressRing.displayName = "ProgressRing";
