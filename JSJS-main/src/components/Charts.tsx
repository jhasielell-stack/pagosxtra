// Custom SVG chart components — no external libraries

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function BarChart({ data, height = 240, formatValue }: BarChartProps) {
  if (data.length === 0) return <div className="text-center text-neutral-500 text-sm py-12">Sin datos</div>;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 100 / data.length;

  return (
    <div className="w-full">
      <div className="relative" style={{ height }}>
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <div key={pct} className="absolute left-0 right-0 border-t border-neutral-800" style={{ bottom: `${pct * 100}%` }}>
            <span className="absolute -left-0 -translate-x-full -translate-y-1/2 text-[10px] text-neutral-600 pr-2">{formatValue ? formatValue(maxVal * pct) : Math.round(maxVal * pct)}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end justify-around pt-4 pb-6">
          {data.map((d, i) => (
            <div key={i} className="flex flex-col items-center justify-end h-full" style={{ width: `${barWidth}%` }}>
              <div className="relative w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
                <span className="text-[10px] font-semibold text-neutral-400 mb-1">{formatValue ? formatValue(d.value) : d.value}</span>
                <div className="w-full rounded-t-md transition-all duration-500 hover:opacity-80" style={{ height: `${(d.value / maxVal) * 100}%`, minHeight: d.value > 0 ? '4px' : '0', backgroundColor: d.color ?? '#e91e63' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-around mt-1 px-2">
        {data.map((d, i) => (<div key={i} className="text-center" style={{ width: `${barWidth}%` }}><span className="text-[10px] text-neutral-500 leading-tight block truncate px-1">{d.label}</span></div>))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

export function DonutChart({ data, size = 180 }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2;
  const strokeWidth = size * 0.18;
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);

  if (total === 0) return <div className="text-center text-neutral-500 text-sm py-12">Sin datos</div>;

  let offset = 0;
  const segments = data.map((d) => {
    const fraction = d.value / total;
    const dash = fraction * circumference;
    const segment = { color: d.color, dash, gap: circumference - dash, offset, label: d.label, value: d.value, pct: Math.round(fraction * 100) };
    offset -= dash;
    return segment;
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={radius} cy={radius} r={radius - strokeWidth / 2} fill="none" stroke="#262626" strokeWidth={strokeWidth} />
          {segments.map((s, i) => (<circle key={i} cx={radius} cy={radius} r={radius - strokeWidth / 2} fill="none" stroke={s.color} strokeWidth={strokeWidth} strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={s.offset} strokeLinecap="butt" style={{ transition: 'stroke-dasharray 0.5s ease' }} />))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{total}</span>
          <span className="text-xs text-neutral-500">Total</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((s, i) => (<div key={i} className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} /><span className="text-sm text-neutral-400">{s.label}</span><span className="text-sm font-semibold text-white">{s.pct}%</span></div>))}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: { label: string; value: number; amount: number }[];
  height?: number;
}

export function LineChart({ data, height = 240 }: LineChartProps) {
  if (data.length === 0) return <div className="text-center text-neutral-500 text-sm py-12">Sin datos</div>;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const width = 100;
  const points = data.map((d, i) => ({ x: (i / (data.length - 1 || 1)) * width, yVal: height - 30 - (d.value / maxVal) * (height - 60), yAmt: height - 30 - (d.amount / maxAmount) * (height - 60), ...d }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yVal}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - 30} L 0 ${height - 30} Z`;
  const amountPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yAmt}`).join(' ');

  return (
    <div className="w-full">
      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e91e63" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#e91e63" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (<line key={pct} x1="0" y1={height - 30 - pct * (height - 60)} x2={width} y2={height - 30 - pct * (height - 60)} stroke="#262626" strokeWidth="0.3" />))}
          <path d={areaPath} fill="url(#areaGradient)" />
          <path d={linePath} fill="none" stroke="#e91e63" strokeWidth="0.5" />
          <path d={amountPath} fill="none" stroke="#ec4899" strokeWidth="0.5" strokeDasharray="1 1" />
          {points.map((p, i) => (<circle key={i} cx={p.x} cy={p.yVal} r="0.8" fill="#e91e63" />))}
        </svg>
        <div className="absolute inset-0 flex justify-around pointer-events-none">
          {points.map((p, i) => (<div key={i} className="flex flex-col items-center justify-end h-full relative"><div className="group absolute" style={{ bottom: `${height - p.yVal - 10}px`, left: `${p.x}%` }}><div className="opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-800 text-neutral-200 text-xs rounded-lg px-2 py-1 whitespace-nowrap absolute -translate-x-1/2 -translate-y-full z-10">{p.value} solicitudes · ${p.amount.toLocaleString()}</div></div></div>))}
        </div>
      </div>
      <div className="flex justify-around mt-1 px-2">{data.map((d, i) => (<span key={i} className="text-[10px] text-neutral-500">{d.label}</span>))}</div>
      <div className="flex gap-4 justify-center mt-3">
        <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-pink-500" /><span className="text-xs text-neutral-500">Solicitudes</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-pink-400" style={{ borderTop: '1px dashed' }} /><span className="text-xs text-neutral-500">Monto total</span></div>
      </div>
    </div>
  );
}
