import { ProductRepository } from './repositories/productRepository';
import { SalesRepository } from './repositories/salesRepository';
import { MovementRepository } from './repositories/movementRepository';
import { CardRepository } from './repositories/cardRepository';
import { SettingsRepository, type SettingsMap } from './settingsRepository';
import { dbService } from './database';
import type { ProductInput, CardInput, MoveInput, SaleInput, SessionInput, DashboardData } from '../types';

export const api = {
  async getProducts() {
    return ProductRepository.getAll();
  },

  async getProductByCode(code: string) {
    return ProductRepository.findByCode(code);
  },

  async addProduct(product: ProductInput) {
    return ProductRepository.add(product);
  },

  async updateProduct(id: number, product: ProductInput) {
    return ProductRepository.update(id, product);
  },

  async deleteProduct(id: number) {
    return ProductRepository.delete(id);
  },

  async getCards() {
    return CardRepository.getAll();
  },

  async addCard(card: CardInput) {
    return CardRepository.add(card);
  },

  async updateCard(id: number, card: CardInput) {
    return CardRepository.update(id, card);
  },

  async deleteCard(id: number) {
    return CardRepository.delete(id);
  },

  async moveInventory(move: MoveInput) {
    const session = await this.getCurrentSession();
    move.session_id = session.id;
    move.timestamp = new Date().toISOString();

    const productResult = await dbService.query('SELECT name FROM products WHERE id = ?', [move.product_id]);
    if (productResult.values && productResult.values.length > 0) {
      move.product_name = productResult.values[0].name;
    }

    await MovementRepository.add(move);
    return { success: true };
  },

  async createSale(sale: SaleInput) {
    const session = await this.getCurrentSession();
    const saleWithSession = { ...sale, session_id: session.id };
    return await SalesRepository.createSale(saleWithSession);
  },

  async getCurrentReport() {
    const session = await this.getCurrentSession();
    const sales = await SalesRepository.getSalesBySession(session.id);
    const movements = await MovementRepository.getBySession(session.id);
    return { sales, movements, session };
  },

  async getSessionHistory() {
    return SalesRepository.getSessionHistory();
  },

  async updateSession(id: number, data: SessionInput) {
    return SalesRepository.updateSession(id, data);
  },

  async deleteSession(id: number) {
    return SalesRepository.deleteSession(id);
  },

  async closeSession() {
    const session = await this.getCurrentSession();
    await SalesRepository.closeSession(session.id, new Date().toISOString());
    await SalesRepository.createSession({ start_time: new Date().toISOString() });
    return { success: true };
  },

  async getSessionReport(id: number) {
    const sales = await SalesRepository.getSalesBySession(id);
    const movements = await MovementRepository.getBySession(id);
    return { sales, movements };
  },

  async cancelSale(saleId: number) {
    return SalesRepository.cancelSale(saleId);
  },

  async getCurrentSession() {
    let session = await SalesRepository.getCurrentSession();
    if (!session) {
      session = await SalesRepository.createSession({ start_time: new Date().toISOString() });
    }
    return session;
  },

  async getAllSettings(): Promise<SettingsMap> {
    return SettingsRepository.getAll();
  },

  async saveSetting(key: string, value: string): Promise<void> {
    return SettingsRepository.set(key, value);
  },

  async saveProfilePhoto(base64: string): Promise<string> {
    return SettingsRepository.saveProfilePhoto(base64);
  },

  async getProfilePhoto(): Promise<string | null> {
    return SettingsRepository.getProfilePhoto();
  },

  async deleteProfilePhoto(): Promise<void> {
    return SettingsRepository.deleteProfilePhoto();
  },

  async getDashboardData(lowStockThreshold: number = 5): Promise<DashboardData> {
    const [todayStats, topProducts, lowStockCount, recentSales, weeklySales] = await Promise.all([
      SalesRepository.getTodayStats(),
      SalesRepository.getTopProducts(5),
      SalesRepository.getLowStockCount(lowStockThreshold),
      SalesRepository.getRecentSales(5),
      SalesRepository.getWeeklySales(),
    ]);
    return { todayStats, topProducts, lowStockCount, recentSales, weeklySales };
  },
};
