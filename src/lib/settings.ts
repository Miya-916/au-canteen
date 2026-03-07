import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

export interface AppSettings {
  system: {
    siteTitle: string;
    timezone: string;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    language: 'en' | 'zh';
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  system: {
    siteTitle: 'AU Canteen Admin',
    timezone: 'Asia/Shanghai',
  },
  appearance: {
    theme: 'system',
    language: 'en',
  },
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (error) {
    // If file doesn't exist, return default settings
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}
