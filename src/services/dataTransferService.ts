import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { dbService } from './database';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

class DataTransferService {
  async exportDatabase(): Promise<string> {
    const tables = ['products', 'customers', 'sales', 'sale_items', 'payments', 'sessions', 'movements', 'settings'];
    const workbook = XLSX.utils.book_new();

    for (const table of tables) {
      const result = await dbService.query(`SELECT * FROM ${table};`);
      const data = result.values || [];
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, table);
    }

    const fileName = `backup_ventas_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;

    if (Capacitor.isNativePlatform()) {
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const result = await Filesystem.writeFile({
        path: fileName,
        data: wbout,
        directory: Directory.Documents,
      });

      await Share.share({
        title: 'Exportar Base de Datos',
        text: 'Backup de la base de datos de ventas',
        url: result.uri,
        dialogTitle: 'Compartir Backup',
      });
      return `Archivo guardado en: ${result.uri}`;
    } else {
      XLSX.writeFile(workbook, fileName);
      return `Archivo descargado: ${fileName}`;
    }
  }

  async importDatabase(base64Data: string): Promise<void> {
    const wb = XLSX.read(base64Data, { type: 'base64' });
    const json: any = {};
    wb.SheetNames.forEach(sheetName => {
      json[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    });

    // Disable foreign keys for safe import
    await dbService.run(`PRAGMA foreign_keys = OFF;`);

    // Clear existing data in reverse order of dependency
    const tables = ['sale_items', 'payments', 'sales', 'movements', 'sessions', 'products', 'customers', 'settings'];
    for (const table of tables) {
      await dbService.run(`DELETE FROM ${table};`);
    }

    // Import data in dependency order
    const importOrder = ['settings', 'customers', 'sessions', 'products', 'sales', 'payments', 'sale_items', 'movements'];
    for (const table of importOrder) {
      const rows = json[table] || [];
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders});`;
        await dbService.run(sql, values);
      }
    }

    // Re-enable foreign keys
    await dbService.run(`PRAGMA foreign_keys = ON;`);
  }
}

export const dataTransferService = new DataTransferService();
