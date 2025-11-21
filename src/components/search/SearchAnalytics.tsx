'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Search, 
  Clock, 
  Target,
  Download,
  Calendar,
  Filter
} from 'lucide-react';

interface SearchAnalyticsProps {
  projectId: string;
  className?: string;
}

interface AnalyticsData {
  totalSearches: number;
  averageResponseTime: number;
  popularQueries: Array<{
    query: string;
    count: number;
    avgResponseTime: number;
  }>;
  searchTrends: Array<{
    date: string;
    searches: number;
    avgResponseTime: number;
  }>;
  entityTypeDistribution: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  performanceMetrics: {
    cacheHitRate: number;
    averageResultCount: number;
    slowQueries: Array<{
      query: string;
      responseTime: number;
      timestamp: string;
    }>;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function SearchAnalytics({ projectId, className = '' }: SearchAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // days
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [projectId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/search/analytics/${projectId}?days=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = async () => {
    try {
      const response = await fetch(`/api/search/analytics/${projectId}/export?days=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export analytics');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-analytics-${projectId}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-secondary-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-secondary-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-secondary-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-200 p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">Failed to load analytics</div>
          <div className="text-sm text-secondary-600 mb-4">{error}</div>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`bg-white rounded-lg border border-secondary-200 p-6 ${className}`}>
        <div className="text-center text-secondary-600">
          No analytics data available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-secondary-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-secondary-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-secondary-900">Search Analytics</h2>
            <p className="text-sm text-secondary-600 mt-1">
              Insights and performance metrics for your search queries
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="px-3 py-2 border border-secondary-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={exportAnalytics}
              className="flex items-center space-x-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">
                  {analytics.totalSearches.toLocaleString()}
                </div>
                <div className="text-sm text-blue-600">Total Searches</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-900">
                  {analytics.averageResponseTime}ms
                </div>
                <div className="text-sm text-green-600">Avg Response Time</div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-900">
                  {Math.round(analytics.performanceMetrics.cacheHitRate * 100)}%
                </div>
                <div className="text-sm text-purple-600">Cache Hit Rate</div>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-900">
                  {Math.round(analytics.performanceMetrics.averageResultCount)}
                </div>
                <div className="text-sm text-orange-600">Avg Results</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Trends Chart */}
        <div>
          <h3 className="text-lg font-medium text-secondary-900 mb-4">Search Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.searchTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value: any) => new Date(value).toLocaleDateString()}
                  formatter={(value: any, name: any) => [
                    name === 'searches' ? value : `${value}ms`,
                    name === 'searches' ? 'Searches' : 'Avg Response Time'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="searches" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgResponseTime" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Popular Queries */}
          <div>
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Popular Queries</h3>
            <div className="space-y-3">
              {analytics.popularQueries.slice(0, 10).map((query, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-secondary-900 truncate">
                      "{query.query}"
                    </div>
                    <div className="text-sm text-secondary-600">
                      {query.count} searches • {query.avgResponseTime}ms avg
                    </div>
                  </div>
                  <div className="text-sm font-medium text-primary-600">
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Entity Type Distribution */}
          <div>
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Search by Entity Type</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.entityTypeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, percentage }: any) => `${type} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.entityTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [value, 'Searches']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Slow Queries */}
        {analytics.performanceMetrics.slowQueries.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Slow Queries</h3>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="space-y-2">
                {analytics.performanceMetrics.slowQueries.slice(0, 5).map((query, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="font-medium text-red-900 truncate flex-1 mr-4">
                      "{query.query}"
                    </div>
                    <div className="text-red-600">
                      {query.responseTime}ms
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}