import { Filesystem, Directory } from '@capacitor/filesystem';
import { dbService } from './database';

export type SettingsMap = Record<string, string>;

const DEFAULTS: SettingsMap = {
  business_name: '',
  owner_name: '',
  phone: '',
  address: '',
  currency_symbol: '$',
  low_stock_threshold: '5',
  default_payment_method: 'cash',
};

export const SettingsRepository = {
  async getAll(): Promise<SettingsMap> {
    const result = await dbService.query('SELECT key, value FROM settings WHERE key LIKE ?', ['settings_%']);
    const rows = result.values || [];
    const map: SettingsMap = { ...DEFAULTS };
    for (const row of rows) {
      const key = (row as any).key.replace('settings_', '');
      map[key] = (row as any).value;
    }
    return map;
  },

  async get(key: string): Promise<string | null> {
    const result = await dbService.query('SELECT value FROM settings WHERE key = ?', [`settings_${key}`]);
    if (result.values && result.values.length > 0) {
      return (result.values[0] as any).value;
    }
    return DEFAULTS[key] ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    const dbKey = `settings_${key}`;
    await dbService.run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [dbKey, value]
    );
  },

  async saveProfilePhoto(base64: string): Promise<string> {
    const fileName = 'images/profile_photo.jpg';
    try {
      await dbService.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['settings_profile_photo', fileName]);
    } catch {}
    try {
      await Filesystem.mkdir({ path: 'images', directory: Directory.Data });
    } catch {}
    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Data,
    });
    return fileName;
  },

  async getProfilePhoto(): Promise<string | null> {
    try {
      const result = await Filesystem.readFile({
        path: 'images/profile_photo.jpg',
        directory: Directory.Data,
      });
      return `data:image/jpeg;base64,${result.data}`;
    } catch {
      return null;
    }
  },

  async deleteProfilePhoto(): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: 'images/profile_photo.jpg',
        directory: Directory.Data,
      });
    } catch {}
    try {
      await dbService.run('DELETE FROM settings WHERE key = ?', ['settings_profile_photo']);
    } catch {}
  },
};
