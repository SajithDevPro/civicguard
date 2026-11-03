import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, AlertTriangle, Terminal, Home, Copy, Check } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CivicGuard SEC_SYS_CRASH] Unhandled runtime exception in UI tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleCopyDiagnostics = () => {
    const diagnostics = [
      `[CivicGuard Incident Diagnostic Dump]`,
      `Timestamp: ${new Date().toISOString()}`,
      `Error: ${this.state.error?.name}: ${this.state.error?.message}`,
      `Stack: ${this.state.error?.stack || 'N/A'}`,
      `Component Stack: ${this.state.errorInfo?.componentStack || 'N/A'}`,
      `User Agent: ${navigator.userAgent}`,
    ].join('\n\n');

    navigator.clipboard.writeText(diagnostics).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="w-full max-w-2xl bg-slate-900 border border-rose-900/50 shadow-2xl rounded-lg overflow-hidden backdrop-blur-md">
            {/* Header telemetry band */}
            <div className="bg-rose-950/40 border-b border-rose-900/60 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-400">
                <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse text-rose-500" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider">
                  Operational Anomaly · System Fault Handled
                </span>
              </div>
              <span className="font-mono text-[11px] bg-rose-900/50 text-rose-200 px-2 py-0.5 rounded border border-rose-700/60">
                ERR_CODE: SEC_SYS_500
              </span>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-200 text-lg font-bold">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <h2>Command Center Interface Interrupted</h2>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  CivicGuard’s active telemetry layer encountered an unexpected client runtime exception. 
                  The security boundary isolated this failure to safeguard database integrity and token states.
                </p>
              </div>

              {/* Exception Box */}
              <div className="bg-slate-950 border border-slate-800 rounded p-4 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Terminal className="w-3.5 h-3.5 text-rose-400" />
                    <span>Fault Trace Diagnostics</span>
                  </div>
                  <button
                    type="button"
                    onClick={this.handleCopyDiagnostics}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Trace</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-rose-400 font-semibold break-all">
                  {this.state.error?.toString() || 'Unknown Runtime Exception'}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <details className="mt-2 text-slate-500 hover:text-slate-400 cursor-pointer">
                    <summary className="text-[11px] text-slate-400 hover:text-slate-200">
                      View Component Stack Trace
                    </summary>
                    <pre className="mt-2 text-[10px] text-slate-400 max-h-48 overflow-y-auto whitespace-pre-wrap bg-slate-900/60 p-2.5 rounded border border-slate-800">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                >
                  Clear & Recover View
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded border border-emerald-500 flex items-center gap-2 transition-colors shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reload Command Center
                </button>
              </div>
            </div>

            {/* Footer telemetry */}
            <div className="bg-slate-950/80 px-6 py-2.5 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex items-center justify-between">
              <span>CivicGuard Resilience Architecture v2.4</span>
              <span>RLS & Cryptographic Channels Protected</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
