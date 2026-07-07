import { dbService } from '../database';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import type { ProductInput } from '../../types';

const resolvedImageCache = new Map<string, string | undefined | null>();

async function resolveImagePath(path: string | null | undefined): Promise<string | undefined> {
  if (!path) return undefined;
  if (path.startsWith('data:image') || path.startsWith('http')) return path;
  if (resolvedImageCache.has(path)) {
    const cached = resolvedImageCache.get(path);
    return cached === null ? undefined : cached;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const uri = await Filesystem.getUri({ path, directory: Directory.Data });
      const result = Capacitor.convertFileSrc(uri.uri);
      resolvedImageCache.set(path, result);
      return result;
    } catch (e) {
      resolvedImageCache.set(path, null);
      return undefined;
    }
  }
  resolvedImageCache.set(path, path);
  return path;
}

export function clearImageCache() {
  resolvedImageCache.clear();
}

export const ProductRepository = {
  async getAll() {
    const result = await dbService.query('SELECT * FROM products WHERE deleted = 0');
    const products = result.values || [];
    
    await Promise.all(products.map(p =>
      resolveImagePath(p.image_path).then(img => { p.image = img; })
    ));
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
    resolvedImageCache.clear();
    return { success: true };
  },

  async delete(id: number) {
    await dbService.run('UPDATE products SET deleted = 1 WHERE id = ?', [id]);
    return { success: true };
  }
};
