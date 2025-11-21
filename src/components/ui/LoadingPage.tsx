import LoadingSpinner from './LoadingSpinner';

interface LoadingPageProps {
  message?: string;
}

export default function LoadingPage({ message = 'Loading...' }: LoadingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <h2 className="mt-4 text-xl font-semibold text-secondary-900">
          {message}
        </h2>
        <p className="mt-2 text-secondary-600">
          Please wait while we load your content
        </p>
      </div>
    </div>
  );
}