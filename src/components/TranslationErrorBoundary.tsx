import React, { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

function resetGoogleTranslate() {
  const hostname = window.location.hostname;
  // Clear cookie (both with and without domain)
  document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `googtrans=; path=/; domain=${hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  // Clear our own stored preference
  localStorage.removeItem("vinci-language-preference");
}

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage?: string;
};

export class TranslationErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown) {
    // These errors are commonly triggered when Google Translate mutates DOM nodes
    // that React later tries to reconcile.
    console.error("[TranslationErrorBoundary] App crashed (likely due to translation DOM mutation)", error);
  }

  private handleReset = () => {
    try {
      resetGoogleTranslate();
    } finally {
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <section className="max-w-xl w-full rounded-xl border border-border bg-card/60 backdrop-blur p-6">
          <header className="space-y-2">
            <h1 className="text-xl font-semibold">Page failed to render</h1>
            <p className="text-sm text-muted-foreground">
              This is usually caused by the translation widget changing the page DOM while the app updates.
              Resetting translation restores the site.
            </p>
          </header>

          {this.state.errorMessage && (
            <pre className="mt-4 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg p-3 overflow-auto">
              {this.state.errorMessage}
            </pre>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button onClick={this.handleReset} className="w-full sm:w-auto">
              Reset translation
            </Button>
            <Button variant="outline" onClick={this.handleReload} className="w-full sm:w-auto">
              Reload
            </Button>
          </div>
        </section>
      </main>
    );
  }
}
