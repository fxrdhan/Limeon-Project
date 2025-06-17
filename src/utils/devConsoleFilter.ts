// Development utility to filter out known WebSocket errors in console
// This helps reduce noise during development while preserving important errors

interface ConsoleMethod {
  (...args: unknown[]): void;
}

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Patterns of errors/warnings to suppress in development
const suppressPatterns = [
  /WebSocket connection.*failed.*WebSocket is closed before the connection is established/,
  /WebSocket connection to.*supabase.*failed/,
  /Realtime subscription error.*WebSocket/,
  /Error removing.*channel.*WebSocket/,
  /removeChannel.*WebSocket/,
  /disconnect.*WebSocket/,
  /CHANNEL_ERROR.*WebSocket/,
  /Failed to fetch.*realtime/,
  /Connection lost.*realtime/,
];

// Keywords that indicate WebSocket/realtime related errors
const suppressKeywords = [
  "supabase-js.js",
  "supabaseRealtime.ts",
  "removeChannel",
  "WebSocket is closed before",
  "realtime/v1/websocket",
];

function shouldSuppressMessage(message: string): boolean {
  // Check against patterns
  for (const pattern of suppressPatterns) {
    if (pattern.test(message)) {
      return true;
    }
  }

  // Check against keywords
  for (const keyword of suppressKeywords) {
    if (message.includes(keyword)) {
      return true;
    }
  }

  return false;
}

function createFilteredConsoleMethod(
  originalMethod: ConsoleMethod,
  methodName: string,
): ConsoleMethod {
  return (...args: unknown[]) => {
    // Convert all arguments to strings for checking
    const messageString = args
      .map((arg) =>
        typeof arg === "string"
          ? arg
          : typeof arg === "object"
            ? JSON.stringify(arg)
            : String(arg),
      )
      .join(" ");

    // Check if this message should be suppressed
    if (shouldSuppressMessage(messageString)) {
      // Optionally log a simplified version for debugging
      if (import.meta.env.VITE_DEBUG_REALTIME === "true") {
        originalMethod(
          `[FILTERED ${methodName.toUpperCase()}] Supabase realtime connection issue (set VITE_DEBUG_REALTIME=false to hide)`,
        );
      }
      return;
    }

    // Call the original method for non-suppressed messages
    originalMethod.apply(console, args);
  };
}

export function initDevConsoleFilter() {
  // Only apply filtering in development and if enabled
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_ENABLE_CONSOLE_FILTER !== "false"
  ) {
    console.error = createFilteredConsoleMethod(originalConsoleError, "error");
    console.warn = createFilteredConsoleMethod(originalConsoleWarn, "warn");

    console.log(
      "🔧 Development console filter enabled for WebSocket/Realtime errors",
    );
    console.log(
      "💡 Set VITE_DEBUG_REALTIME=true in .env to see filtered messages",
    );
    console.log(
      "💡 Set VITE_ENABLE_CONSOLE_FILTER=false in .env to disable filtering",
    );
  }
}

export function restoreOriginalConsole() {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log("🔧 Original console methods restored");
}

// Auto-initialize in development
if (
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  import.meta.env.VITE_ENABLE_CONSOLE_FILTER !== "false"
) {
  // Initialize after a short delay to ensure all modules are loaded
  setTimeout(initDevConsoleFilter, 100);
}

// Cleanup on hot reload
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    restoreOriginalConsole();
  });
}
