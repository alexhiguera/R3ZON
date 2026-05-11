"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  handleReset = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="card-glass max-w-md p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 text-danger">
            <AlertTriangle size={22} />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold text-text-hi">Algo salió mal</h2>
          <p className="mt-1 break-words text-sm text-text-mid">
            {this.state.error?.message ?? "Error desconocido"}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-4 text-sm font-bold text-white"
          >
            <RefreshCcw size={14} /> Reintentar
          </button>
        </div>
      </div>
    );
  }
}
