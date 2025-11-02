// Storage polyfill for local development
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    async get(key) {
      try {
        const value = localStorage.getItem(key);
        return value ? { key, value, shared: false } : null;
      } catch (error) {
        return null;
      }
    },
    
    async set(key, value, shared = false) {
      try {
        localStorage.setItem(key, value);
        return { key, value, shared };
      } catch (error) {
        return null;
      }
    },
    
    async delete(key) {
      try {
        localStorage.removeItem(key);
        return { key, deleted: true, shared: false };
      } catch (error) {
        return null;
      }
    },
    
    async list(prefix = '', shared = false) {
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
        return { keys, prefix, shared };
      } catch (error) {
        return null;
      }
    }
  };
}