interface ErrorWithContext {
  message?: string;
  context?: { json?: () => Promise<unknown> };
}

const readErrorField = (value: unknown): string | null => {
  if (value && typeof value === 'object' && 'error' in value) {
    const field = (value as { error: unknown }).error;
    if (typeof field === 'string' && field.length > 0) return field;
  }
  return null;
};

/** Pulls the most helpful message out of a failed backend function call. */
export async function extractFunctionError(error: unknown, data: unknown): Promise<string> {
  const fromData = readErrorField(data);
  if (fromData) return fromData;

  if (error && typeof error === 'object') {
    const withContext = error as ErrorWithContext;
    if (typeof withContext.context?.json === 'function') {
      try {
        const body = await withContext.context.json();
        const fromBody = readErrorField(body);
        if (fromBody) return fromBody;
      } catch {
        // Response body was not JSON; fall back to the generic message below
      }
    }
    if (typeof withContext.message === 'string' && withContext.message.length > 0) {
      return withContext.message;
    }
  }
  return 'Something went wrong while checking your credits. Please try again.';
}
