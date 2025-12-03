import React, { useState, useMemo, useRef } from 'react';
import { 
  X, Download, TrendingUp, BarChart3, LineChart, PieChart,
  Table, Calculator, Zap, ArrowUpRight, ArrowDownRight,
  Minus, Grid3X3, Layers, RefreshCw
} from 'lucide-react';

// Simple chart components (no external dependencies)
export default function ExperimentAnalysisModal({ experiment, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedParams, setSelectedParams] = useState([]);
  const [chartType, setChartType] = useState('line');
  const chartRef = useRef(null);

  const params = experiment.parameters || [];
  const data = experiment.data || [];

  // Initialize selected params
  React.useEffect(() => {
    if (params.length > 0 && selectedParams.length === 0) {
      setSelectedParams(params.slice(0, 2).map(p => p.name));
    }
  }, [params]);

  // Calculate statistics for each parameter
  const statistics = useMemo(() => {
    const stats = {};
    
    params.forEach(param => {
      const values = data
        .map(row => parseFloat(row[param.name]))
        .filter(v => !isNaN(v));
      
      if (values.length === 0) {
        stats[param.name] = null;
        return;
      }

      const n = values.length;
      const mean = values.reduce((a, b) => a + b, 0) / n;
      const sortedValues = [...values].sort((a, b) => a - b);
      const median = n % 2 === 0 
        ? (sortedValues[n/2 - 1] + sortedValues[n/2]) / 2 
        : sortedValues[Math.floor(n/2)];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
      const stdDev = Math.sqrt(variance);
      const cv = (stdDev / mean) * 100; // Coefficient of variation

      // Calculate trend (simple linear regression)
      let trend = 0;
      if (n > 1) {
        const xMean = (n - 1) / 2;
        let numerator = 0;
        let denominator = 0;
        values.forEach((y, x) => {
          numerator += (x - xMean) * (y - mean);
          denominator += Math.pow(x - xMean, 2);
        });
        trend = denominator !== 0 ? numerator / denominator : 0;
      }

      stats[param.name] = {
        n,
        mean,
        median,
        min,
        max,
        range,
        stdDev,
        variance,
        cv,
        trend,
        values
      };
    });

    return stats;
  }, [params, data]);

  // Calculate correlations between parameters
  const correlations = useMemo(() => {
    const corrs = {};
    const paramNames = params.map(p => p.name);

    for (let i = 0; i < paramNames.length; i++) {
      for (let j = i + 1; j < paramNames.length; j++) {
        const p1 = paramNames[i];
        const p2 = paramNames[j];
        
        if (!statistics[p1] || !statistics[p2]) continue;

        const v1 = statistics[p1].values;
        const v2 = statistics[p2].values;
        const n = Math.min(v1.length, v2.length);
        
        if (n < 2) continue;

        const mean1 = statistics[p1].mean;
        const mean2 = statistics[p2].mean;
        const std1 = statistics[p1].stdDev;
        const std2 = statistics[p2].stdDev;

        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += (v1[k] - mean1) * (v2[k] - mean2);
        }
        
        const correlation = std1 > 0 && std2 > 0 
          ? sum / (n * std1 * std2) 
          : 0;

        corrs[`${p1}-${p2}`] = {
          param1: p1,
          param2: p2,
          value: correlation,
          strength: Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.4 ? 'moderate' : 'weak'
        };
      }
    }

    return corrs;
  }, [params, statistics]);

  // Export chart as image
  const exportChart = () => {
    if (!chartRef.current) return;
    
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      const link = document.createElement('a');
      link.download = `${experiment.name}-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'charts', label: 'Charts', icon: LineChart },
    { id: 'statistics', label: 'Statistics', icon: Calculator },
    { id: 'correlations', label: 'Correlations', icon: Grid3X3 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-xl animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              Data Analysis
            </h2>
            <p className="text-sm text-gray-500">{experiment.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportChart}
              className="btn btn-secondary text-sm flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {activeTab === 'overview' && (
            <OverviewTab 
              experiment={experiment}
              statistics={statistics}
              params={params}
              data={data}
            />
          )}
          
          {activeTab === 'charts' && (
            <ChartsTab
              chartRef={chartRef}
              params={params}
              data={data}
              statistics={statistics}
              selectedParams={selectedParams}
              setSelectedParams={setSelectedParams}
              chartType={chartType}
              setChartType={setChartType}
            />
          )}
          
          {activeTab === 'statistics' && (
            <StatisticsTab
              params={params}
              statistics={statistics}
            />
          )}
          
          {activeTab === 'correlations' && (
            <CorrelationsTab
              params={params}
              correlations={correlations}
              statistics={statistics}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ experiment, statistics, params, data }) {
  const summaryStats = params.map(param => ({
    name: param.name,
    unit: param.unit,
    stats: statistics[param.name]
  })).filter(p => p.stats);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Data Points"
          value={data.length}
          icon={Table}
          color="blue"
        />
        <StatCard
          label="Parameters"
          value={params.length}
          icon={Layers}
          color="purple"
        />
        <StatCard
          label="Trends Detected"
          value={summaryStats.filter(s => Math.abs(s.stats?.trend || 0) > 0.1).length}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="High Variance"
          value={summaryStats.filter(s => (s.stats?.cv || 0) > 20).length}
          icon={Zap}
          color="orange"
        />
      </div>

      {/* Parameter Summary Cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Parameter Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          {summaryStats.map(({ name, unit, stats }) => (
            <div key={name} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{name}</h4>
                {unit && <span className="text-xs text-gray-400">{unit}</span>}
              </div>
              
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Mean</p>
                  <p className="font-semibold text-gray-900">{stats.mean.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Std Dev</p>
                  <p className="font-semibold text-gray-900">{stats.stdDev.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Range</p>
                  <p className="font-semibold text-gray-900">{stats.min.toFixed(1)} - {stats.max.toFixed(1)}</p>
                </div>
              </div>

              {/* Trend indicator */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                {stats.trend > 0.1 ? (
                  <>
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-600">Increasing trend</span>
                  </>
                ) : stats.trend < -0.1 ? (
                  <>
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-red-600">Decreasing trend</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">Stable</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mini visualization */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Data Distribution</h3>
        <div className="card p-4">
          <div className="flex gap-4 overflow-x-auto">
            {summaryStats.slice(0, 3).map(({ name, stats }) => (
              <div key={name} className="flex-1 min-w-[200px]">
                <p className="text-xs text-gray-500 mb-2">{name}</p>
                <MiniBarChart values={stats.values} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Charts Tab
function ChartsTab({ chartRef, params, data, statistics, selectedParams, setSelectedParams, chartType, setChartType }) {
  const chartTypes = [
    { id: 'line', label: 'Line', icon: LineChart },
    { id: 'bar', label: 'Bar', icon: BarChart3 },
    { id: 'scatter', label: 'Scatter', icon: PieChart },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Chart type selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Chart Type:</span>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {chartTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setChartType(type.id)}
                className={`p-2 rounded-md transition-colors ${
                  chartType === type.id
                    ? 'bg-white shadow text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <type.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Parameter selector */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm text-gray-500">Parameters:</span>
          <div className="flex flex-wrap gap-2">
            {params.map(param => (
              <button
                key={param.name}
                onClick={() => {
                  if (selectedParams.includes(param.name)) {
                    setSelectedParams(selectedParams.filter(p => p !== param.name));
                  } else {
                    setSelectedParams([...selectedParams, param.name]);
                  }
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedParams.includes(param.name)
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {param.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="card p-6">
        {selectedParams.length > 0 ? (
          <SVGChart
            data={data}
            params={params.filter(p => selectedParams.includes(p.name))}
            statistics={statistics}
            type={chartType}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            Select parameters to visualize
          </div>
        )}
      </div>

      {/* Legend */}
      {selectedParams.length > 0 && (
        <div className="flex flex-wrap gap-4 justify-center">
          {selectedParams.map((param, i) => (
            <div key={param} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-sm text-gray-600">{param}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Statistics Tab
function StatisticsTab({ params, statistics }) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Parameter</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">N</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Mean</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Median</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Std Dev</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Min</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Max</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">CV%</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Trend</th>
            </tr>
          </thead>
          <tbody>
            {params.map(param => {
              const stats = statistics[param.name];
              if (!stats) return null;
              
              return (
                <tr key={param.name} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {param.name}
                    {param.unit && <span className="text-gray-400 ml-1">({param.unit})</span>}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600">{stats.n}</td>
                  <td className="py-3 px-4 text-right text-gray-900 font-medium">{stats.mean.toFixed(3)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{stats.median.toFixed(3)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{stats.stdDev.toFixed(3)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{stats.min.toFixed(3)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{stats.max.toFixed(3)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`${stats.cv > 20 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {stats.cv.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {stats.trend > 0.1 ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <ArrowUpRight className="w-4 h-4" />
                      </span>
                    ) : stats.trend < -0.1 ? (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <ArrowDownRight className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Statistical Notes */}
      <div className="card p-4 bg-blue-50 border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Statistical Notes</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>CV (Coefficient of Variation)</strong>: Values &gt;20% indicate high variability</li>
          <li>• <strong>Trend</strong>: Based on linear regression slope across data points</li>
          <li>• <strong>Std Dev</strong>: Standard deviation measures data spread around the mean</li>
        </ul>
      </div>
    </div>
  );
}

// Correlations Tab
function CorrelationsTab({ params, correlations, statistics }) {
  const corrArray = Object.values(correlations);

  return (
    <div className="space-y-6">
      {/* Correlation Matrix */}
      {params.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Correlation Matrix</h3>
          <div className="card p-4 overflow-x-auto">
            <CorrelationMatrix params={params} correlations={correlations} />
          </div>
        </div>
      )}

      {/* Correlation List */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Correlation Details</h3>
        {corrArray.length > 0 ? (
          <div className="space-y-2">
            {corrArray
              .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
              .map((corr, i) => (
                <div key={i} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      corr.strength === 'strong' ? 'bg-green-500' :
                      corr.strength === 'moderate' ? 'bg-yellow-500' : 'bg-gray-300'
                    }`} />
                    <span className="font-medium text-gray-900">
                      {corr.param1} ↔ {corr.param2}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-semibold ${
                      corr.value > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      r = {corr.value.toFixed(3)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      corr.strength === 'strong' ? 'bg-green-100 text-green-700' :
                      corr.strength === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {corr.strength}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-400">
            Need at least 2 parameters with data to calculate correlations
          </div>
        )}
      </div>

      {/* Interpretation Guide */}
      <div className="card p-4 bg-purple-50 border-purple-200">
        <h4 className="text-sm font-semibold text-purple-900 mb-2">Correlation Interpretation</h4>
        <div className="grid grid-cols-3 gap-4 text-sm text-purple-800">
          <div>
            <p className="font-medium">Strong (|r| &gt; 0.7)</p>
            <p className="text-xs">Variables move closely together</p>
          </div>
          <div>
            <p className="font-medium">Moderate (0.4 - 0.7)</p>
            <p className="text-xs">Notable relationship exists</p>
          </div>
          <div>
            <p className="font-medium">Weak (|r| &lt; 0.4)</p>
            <p className="text-xs">Little to no linear relationship</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({ values }) {
  if (!values || values.length === 0) return null;
  
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-0.5 h-12">
      {values.slice(0, 20).map((v, i) => (
        <div
          key={i}
          className="flex-1 bg-primary-400 rounded-t min-w-[4px]"
          style={{ height: `${((v - min) / range) * 100}%`, minHeight: '4px' }}
        />
      ))}
    </div>
  );
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function SVGChart({ data, params, statistics, type }) {
  const width = 700;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  if (data.length === 0 || params.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-400">No data to display</div>;
  }

  // Get all values for scaling
  let allValues = [];
  params.forEach(param => {
    const vals = data.map(row => parseFloat(row[param.name])).filter(v => !isNaN(v));
    allValues = [...allValues, ...vals];
  });

  const minY = Math.min(...allValues);
  const maxY = Math.max(...allValues);
  const yRange = maxY - minY || 1;

  const scaleY = (v) => chartHeight - ((v - minY) / yRange) * chartHeight;
  const scaleX = (i) => (i / (data.length - 1 || 1)) * chartWidth;

  // Generate Y-axis ticks
  const yTicks = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const value = minY + (yRange * i) / tickCount;
    yTicks.push({ value, y: scaleY(value) });
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      <g>
        {yTicks.map((tick, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={padding.top + tick.y}
            x2={width - padding.right}
            y2={padding.top + tick.y}
            stroke="#e5e7eb"
            strokeDasharray="4"
          />
        ))}
      </g>

      {/* Y-axis */}
      <g>
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#9ca3af"
        />
        {yTicks.map((tick, i) => (
          <text
            key={i}
            x={padding.left - 10}
            y={padding.top + tick.y + 4}
            textAnchor="end"
            className="text-xs fill-gray-500"
          >
            {tick.value.toFixed(1)}
          </text>
        ))}
      </g>

      {/* X-axis */}
      <g>
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#9ca3af"
        />
        {data.filter((_, i) => i % Math.ceil(data.length / 10) === 0).map((_, i) => {
          const idx = i * Math.ceil(data.length / 10);
          return (
            <text
              key={idx}
              x={padding.left + scaleX(idx)}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {idx + 1}
            </text>
          );
        })}
      </g>

      {/* Data */}
      <g transform={`translate(${padding.left}, ${padding.top})`}>
        {params.map((param, paramIndex) => {
          const color = COLORS[paramIndex % COLORS.length];
          const values = data.map(row => parseFloat(row[param.name]));
          const validPoints = values.map((v, i) => ({ x: scaleX(i), y: scaleY(v), valid: !isNaN(v) }));

          if (type === 'line') {
            const pathData = validPoints
              .filter(p => p.valid)
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
              .join(' ');

            return (
              <g key={param.name}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                />
                {validPoints.filter(p => p.valid).map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="4" fill={color} />
                ))}
              </g>
            );
          }

          if (type === 'bar') {
            const barWidth = (chartWidth / data.length / params.length) * 0.8;
            const offset = paramIndex * barWidth;

            return (
              <g key={param.name}>
                {validPoints.filter(p => p.valid).map((p, i) => (
                  <rect
                    key={i}
                    x={scaleX(i) - barWidth * params.length / 2 + offset}
                    y={p.y}
                    width={barWidth}
                    height={chartHeight - p.y}
                    fill={color}
                    opacity={0.8}
                  />
                ))}
              </g>
            );
          }

          if (type === 'scatter') {
            return (
              <g key={param.name}>
                {validPoints.filter(p => p.valid).map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="6" fill={color} opacity={0.7} />
                ))}
              </g>
            );
          }

          return null;
        })}

        {/* Trend lines */}
        {type === 'line' && params.map((param, i) => {
          const stats = statistics[param.name];
          if (!stats || Math.abs(stats.trend) < 0.1) return null;

          const color = COLORS[i % COLORS.length];
          const startY = stats.mean - stats.trend * (data.length - 1) / 2;
          const endY = stats.mean + stats.trend * (data.length - 1) / 2;

          return (
            <line
              key={`trend-${param.name}`}
              x1={0}
              y1={scaleY(startY)}
              x2={chartWidth}
              y2={scaleY(endY)}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="8"
              opacity={0.5}
            />
          );
        })}
      </g>
    </svg>
  );
}

function CorrelationMatrix({ params, correlations }) {
  const getCorrelation = (p1, p2) => {
    if (p1 === p2) return 1;
    const key1 = `${p1}-${p2}`;
    const key2 = `${p2}-${p1}`;
    return correlations[key1]?.value || correlations[key2]?.value || 0;
  };

  const getColor = (value) => {
    if (value >= 0.7) return 'bg-green-500 text-white';
    if (value >= 0.4) return 'bg-green-200 text-green-900';
    if (value >= 0) return 'bg-gray-100 text-gray-700';
    if (value >= -0.4) return 'bg-red-100 text-red-900';
    if (value >= -0.7) return 'bg-red-200 text-red-900';
    return 'bg-red-500 text-white';
  };

  return (
    <table className="text-sm">
      <thead>
        <tr>
          <th className="p-2"></th>
          {params.map(p => (
            <th key={p.name} className="p-2 text-xs font-medium text-gray-600 max-w-[80px] truncate">
              {p.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {params.map(p1 => (
          <tr key={p1.name}>
            <td className="p-2 text-xs font-medium text-gray-600 max-w-[80px] truncate">{p1.name}</td>
            {params.map(p2 => {
              const corr = getCorrelation(p1.name, p2.name);
              return (
                <td key={p2.name} className="p-1">
                  <div className={`w-12 h-8 flex items-center justify-center rounded text-xs font-medium ${getColor(corr)}`}>
                    {corr.toFixed(2)}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
