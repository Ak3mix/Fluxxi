import { dbService } from '../database';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import type { ProductInput } from '../../types';

async function resolveImagePath(path: string | null | undefined): Promise<string | undefined> {
  if (!path) return undefined;
  if (path.startsWith('data:image') || path.startsWith('http')) return path;

  if (Capacitor.isNativePlatform()) {
    try {
      const uri = await Filesystem.getUri({
        path: path,
        directory: Directory.Data,
      });
      return Capacitor.convertFileSrc(uri.uri);
    } catch (e) {
      console.error('Error resolving image path', e);
      return undefined;
    }
  }
  return path;
}

export const ProductRepository = {
  async getAll() {
    const result = await dbService.query('SELECT * FROM products WHERE deleted = 0');
    const products = result.values || [];
    
    // Resolve paths for UI
    for (const p of products) {
      p.image = await resolveImagePath(p.image_path);
    }
    return products;
  },

  async findByCode(code: string) {
    const result = await dbService.query('SELECT * FROM products WHERE code = ? AND deleted = 0 LIMIT 1', [code]);
    if (result.values && result.values.length > 0) {
      const p = result.values[0];
      p.image = await resolveImagePath(p.image_path);
      return p;
    }
    return null;
  },

  async add(product: ProductInput) {
    const result = await dbService.run(
      'INSERT INTO products (name, code, price, cost, stock, initial_stock, category, image_path, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
      [product.name, product.code, product.price, product.cost, product.stock, product.initial_stock, product.category, product.image]
    );
    return { ...product, id: result.changes?.lastId };
  },

  async update(id: number, product: ProductInput) {
    await dbService.run(
      'UPDATE products SET name = ?, code = ?, price = ?, cost = ?, stock = ?, category = ?, image_path = ? WHERE id = ?',
      [product.name, product.code, product.price, product.cost, product.stock, product.category, product.image, id]
    );
    return { success: true };
  },

  async delete(id: number) {
    await dbService.run('UPDATE products SET deleted = 1 WHERE id = ?', [id]);
    return { success: true };
  }
};
