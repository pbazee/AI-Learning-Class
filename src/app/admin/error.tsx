'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[Admin Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
        <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
      </div>
      
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
        Something went wrong in the Dashboard
      </h1>
      
      <p className="mt-4 max-w-md text-base text-slate-600 dark:text-slate-400">
        An unexpected error occurred while loading this page. This might be due to a missing configuration or a temporary service issue.
      </p>

      {error.message && (
        <div className="mt-6 rounded-md bg-slate-50 p-4 text-left dark:bg-slate-900/50">
          <p className="font-mono text-sm text-red-500 line-clamp-3">
            {error.message}
          </p>
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button
          onClick={() => reset()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <RefreshCcw className="h-4 w-4" />
          Try Again
        </Button>
        
        <Link href="/dashboard">
          <Button variant="outline" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      
      {error.digest && (
        <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
