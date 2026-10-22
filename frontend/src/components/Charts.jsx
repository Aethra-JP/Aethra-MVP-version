import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { inr } from '../lib/format'

const COLORS = ['#e8c97a', '#efe9da', '#93c48e']
const axis = { fill: '#a39b86', fontSize: 12 }
const tip = { contentStyle: { background: '#17150f', border: '1px solid #2b261c', borderRadius: 6, color: '#efe9da' }, labelStyle: { color: '#a39b86' } }
const compact = (v) => (Math.abs(v) >= 1e5 ? `${(v / 1e5).toFixed(1)}L` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : v)

export function LineSeries({ data, xKey = 'x', series = ['value'], height = 260 }) {
  return (
    <div style={{ height }} role="img" aria-label="Line chart">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="#2b261c" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={axis} minTickGap={24} />
          <YAxis tick={axis} tickFormatter={compact} width={48} />
          <Tooltip {...tip} formatter={(v) => inr(v)} />
          {series.map((s, i) => (
            <Line key={s} type="monotone" dataKey={s} stroke={COLORS[i % 3]} strokeWidth={2} dot={false} connectNulls
              strokeDasharray={s === 'forecast' ? '6 4' : undefined} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarSeries({ data, xKey = 'x', series = ['value'], height = 260 }) {
  return (
    <div style={{ height }} role="img" aria-label="Bar chart">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="#2b261c" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={axis} interval={0} angle={data.length > 6 ? -25 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} height={data.length > 6 ? 70 : 30} />
          <YAxis tick={axis} tickFormatter={compact} width={48} />
          <Tooltip {...tip} formatter={(v) => inr(v)} />
          {series.map((s, i) => <Bar key={s} dataKey={s} fill={COLORS[i % 3]} radius={[3, 3, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChartCard({ spec }) {
  const C = spec.type === 'bar' ? BarSeries : LineSeries
  return (
    <div className="card mt-3">
      <div className="font-bold mb-2">{spec.title}</div>
      <C data={spec.data} xKey="x" series={spec.series || ['value']} height={230} />
    </div>
  )
}
