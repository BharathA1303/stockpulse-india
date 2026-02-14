import { useState, useMemo } from 'react';
import { useChartData } from '../hooks/useStockData';
import { formatINR, formatChartDate } from '../utils/formatters';
import { TIME_RANGES } from '../constants/stockSymbols';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

/**
 * Premium interactive price chart with gradient fill and time-range selector.
 */
export default function Chart({ symbol }) {
  const [range, setRange] = useState('1mo');
  const { data, loading, error, refetch } = useChartData(symbol, range);

  // Determine chart direction and styling
  const { chartColor, chartColorRgb, chartData } = useMemo(() => {
    if (!data?.data?.length) return { chartColor: 'var(--accent)', chartColorRgb: '99, 102, 241', chartData: [] };
    const points = data.data;
    const first = points[0].close;
    const last = points[points.length - 1].close;
    const isUp = last >= first;
    return {
      chartColor: isUp ? '#00d09c' : '#ff5252',
      chartColorRgb: isUp ? '0, 208, 156' : '255, 82, 82',
      chartData: points.map((p) => ({
        ...p,
        dateLabel: formatChartDate(p.date, range),
      })),
    };
  }, [data, range]);

  if (!symbol) return null;

  return (
    <section className="chart-section" aria-label="Historical price chart">
      <div className="chart-header">
        <h3 className="chart-title">Price History</h3>
        <div className="time-range-buttons" role="group" aria-label="Select time range">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              className={`time-btn ${range === tr.value ? 'active' : ''}`}
              onClick={() => setRange(tr.value)}
              aria-pressed={range === tr.value}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-container">
        {loading && (
          <div className="chart-loading" aria-busy="true">
            <span className="search-spinner" /> Loading chart…
          </div>
        )}

        {error && (
          <div className="chart-error" role="alert">
            <div className="error-icon">📊</div>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={refetch}>Retry</button>
          </div>
        )}

        {!loading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                  <stop offset="50%" stopColor={chartColor} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" strokeOpacity={0.5} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-light)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                tickFormatter={(v) => `₹${v.toLocaleString('en-IN')}`}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-lg)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  padding: '10px 14px',
                }}
                formatter={(value) => [formatINR(value), 'Price']}
                labelFormatter={(label) => label}
                cursor={{ stroke: chartColor, strokeDasharray: '4 4', strokeOpacity: 0.5 }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={chartColor}
                strokeWidth={2.5}
                fill="url(#colorClose)"
                dot={false}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: chartColor,
                  fill: 'var(--card-bg)',
                  style: { filter: `drop-shadow(0 0 4px rgba(${chartColorRgb}, 0.4))` }
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {!loading && !error && chartData.length === 0 && (
          <div className="chart-empty">No chart data available</div>
        )}
      </div>
    </section>
  );
}
