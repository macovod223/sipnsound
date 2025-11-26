import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { useSettings } from './SettingsContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // В production можно отправить ошибку в сервис логирования (Sentry, LogRocket и т.д.)
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error }: { error: Error | null }) {
  const { t } = useSettings();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#121212] p-4">
      <div className="max-w-md w-full glass-card rounded-lg p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          {t('somethingWentWrong') || 'Что-то пошло не так'}
        </h2>
        <p className="text-gray-400 mb-4">
          {error?.message || 'Произошла непредвиденная ошибка'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#1ED760] hover:bg-[#1DB954] text-black font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {t('reloadPage') || 'Перезагрузить страницу'}
        </button>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children, fallback }: Props) {
  return <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>;
}

