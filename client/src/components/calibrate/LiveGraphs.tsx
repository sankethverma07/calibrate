import React from 'react';

interface LiveGraphsProps {
  data: Array<{ wpm: number; accuracy: number; backspaces: number; time: number }>;
}

const MiniSparkline = ({
  data,
  label,
  color,
  currentValue,
  unit = '',
  max,
}: {
  data: number[];
  label: string;
  color: string;
  currentValue: string;
  unit?: string;
  max: number;
}) => {
  const points = data.slice(-20); // Show last 20 points
  const width = 100;
  const height = 32;
  const step = width / Math.max(points.length - 1, 1);

  const pathData = points.map((value, i) => {
    const x = i * step;
    const y = height - (value / max) * height;
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-end">
        <span className="text-[10px] text-white/45 uppercase tracking-[0.15em]">
          {label}
        </span>
        <span className="text-[11px] text-white/80 font-mono tracking-wider">
          {currentValue}{unit}
        </span>
      </div>
      <svg 
        width="100%" 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

export default function LiveGraphs({ data }: LiveGraphsProps) {
  const latest = data.length > 0 ? data[data.length - 1] : { wpm: 0, accuracy: 100, backspaces: 0, time: 0 };

  const wpmValues = data.map(d => d.wpm);
  const accuracyValues = data.map(d => d.accuracy);
  const backspacesValues = data.map(d => d.backspaces);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-white/10 pb-2">
        <span className="text-white/90 text-[16px] tracking-[0.275px] uppercase">
          Live Telemetry
        </span>
      </div>

      <MiniSparkline
        data={wpmValues}
        label="WPM"
        color="rgba(255,255,255,0.6)"
        currentValue={String(latest.wpm).padStart(3, '0')}
        max={120}
      />

      <MiniSparkline
        data={accuracyValues}
        label="Accuracy"
        color="rgba(52,211,153,0.7)"
        currentValue={String(latest.accuracy)}
        unit="%"
        max={100}
      />

      <MiniSparkline
        data={backspacesValues}
        label="Backspaces"
        color="rgba(251,191,36,0.6)"
        currentValue={String(latest.backspaces).padStart(2, '0')}
        max={50}
      />
    </div>
  );
}
