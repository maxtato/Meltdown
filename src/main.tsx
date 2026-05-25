import React from 'react';
import { createRoot } from 'react-dom/client';
import Meltdown from '../meltdown';

declare global {
  interface Window {
    storage?: {
      get: (key: string) => Promise<{ value: string } | null>;
      set: (key: string, value: string) => Promise<void>;
      delete: (key: string) => Promise<void>;
    };
  }
}

if (!window.storage) {
  window.storage = {
    async get(key: string) {
      const value = localStorage.getItem(key);
      return value == null ? null : { value };
    },
    async set(key: string, value: string) {
      localStorage.setItem(key, value);
    },
    async delete(key: string) {
      localStorage.removeItem(key);
    },
  };
}

document.body.style.margin = '0';

createRoot(document.getElementById('root')!).render(<Meltdown />);
