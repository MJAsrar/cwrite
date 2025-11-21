'use client';

import { SystemStatus } from '@/types';
import Button from '@/components/ui/Button';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Database, 
  Zap, 
  Search,
  RefreshCw
} from 'lucide-react';

interface SystemStatusDisplayProps {
  status: SystemStatus;
}

interface ServiceStatusProps {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  icon: any;
}

function ServiceStatus({ name, status, icon: Icon }: ServiceStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-secondary-600 bg-secondary-50 border-secondary-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'down':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-secondary-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'healthy':
        return 'Operational';
      case 'degraded':
        return 'Degraded';
      case 'down':
        return 'Down';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center space-x-3">
        <Icon className="w-5 h-5" />
        <span className="font-medium">{name}</span>
      </div>
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
    </div>
  );
}

export default function SystemStatusDisplay({ status }: SystemStatusDisplayProps) {
  const getOverallStatusColor = () => {
    switch (status.status) {
      case 'healthy':
        return 'border-green-200 bg-green-50';
      case 'degraded':
        return 'border-yellow-200 bg-yellow-50';
      case 'down':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-secondary-200 bg-secondary-50';
    }
  };

  const getOverallStatusIcon = () => {
    switch (status.status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-secondary-400" />;
    }
  };

  const getOverallStatusText = () => {
    switch (status.status) {
      case 'healthy':
        return 'All systems operational';
      case 'degraded':
        return 'Some services experiencing issues';
      case 'down':
        return 'System maintenance in progress';
      default:
        return 'Status unknown';
    }
  };

  const formatLastUpdated = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Only show if there are issues or if explicitly requested
  const shouldShow = status.status !== 'healthy';
  
  if (!shouldShow) {
    return null;
  }

  return (
    <div className={`rounded-lg border p-4 ${getOverallStatusColor()}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getOverallStatusIcon()}
          <div>
            <h3 className="font-semibold text-secondary-900">System Status</h3>
            <p className="text-sm text-secondary-600">{getOverallStatusText()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-secondary-500">Last updated</p>
          <p className="text-sm font-medium text-secondary-700">
            {formatLastUpdated(status.last_updated)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ServiceStatus
          name="Database"
          status={status.services.database}
          icon={Database}
        />
        <ServiceStatus
          name="Cache"
          status={status.services.redis}
          icon={Zap}
        />
        <ServiceStatus
          name="Indexing"
          status={status.services.indexing}
          icon={Search}
        />
      </div>

      {status.status !== 'healthy' && (
        <div className="mt-4 pt-4 border-t border-current border-opacity-20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-secondary-600">
              We're working to resolve any issues. Your data is safe.
            </p>
            <Button 
              variant="ghost" 
              className="flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Status</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}