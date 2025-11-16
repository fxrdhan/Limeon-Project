/**
 * Developer Console Commands for PharmaSys
 *
 * Usage: Open browser console and type:
 * - window.pharmaSys.storage.listAll() - List all localStorage keys
 */

// Storage utilities
const storageCommands = {
  /**
   * List all localStorage keys
   */
  listAll: () => {
    console.log('📋 All localStorage keys:');
    console.log('─────────────────────────────────────');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        const size = value ? (value.length / 1024).toFixed(2) : '0';
        console.log(`${i + 1}. ${key} (${size} KB)`);
      }
    }
    console.log('─────────────────────────────────────');
    console.log(`Total: ${localStorage.length} keys`);
  },
};

// Main PharmaSys console API
export const pharmaSysConsoleAPI = {
  storage: storageCommands,
};

// Initialize console API
export const initConsoleAPI = () => {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).pharmaSys = pharmaSysConsoleAPI;

    if (process.env.NODE_ENV === 'development') {
      // console.log('🏥 PharmaSys Console API loaded');
      // console.log(
      //   '   Type: window.pharmaSys.storage.listAll() to view localStorage keys'
      // );
    }
  }
};

// Auto-initialize in development mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  initConsoleAPI();
}
