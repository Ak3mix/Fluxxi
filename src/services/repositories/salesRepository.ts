import { dbService } from '../database';
import type { SessionInput, SaleInput } from '../../types';

export const SalesRepository = {
  async getCurrentSession() {
    const result = await dbService.query('SELECT * FROM sessions WHERE is_closed = 0 LIMIT 1');
    return result.values && result.values.length > 0 ? result.values[0] : null;
  },

  async createSession(session: SessionInput) {
    await dbService.run('INSERT INTO sessions (start_time, is_closed) VALUES (?, 0)', [session.start_time]);
    return this.getCurrentSession();
  },

  async closeSession(id: number, endTime: string) {
    await dbService.run('UPDATE sessions SET is_closed = 1, end_time = ? WHERE id = ?', [endTime, id]);
  },

  async updateSession(id: number, data: SessionInput) {
    await dbService.run('UPDATE sessions SET name = ? WHERE id = ?', [data.name, id]);
  },

  async deleteSession(id: number) {
    await dbService.run('UPDATE sessions SET deleted = 1 WHERE id = ?', [id]);
  },

  async createSale(sale: SaleInput & { session_id: number }) {
    const timestamp = sale.timestamp || new Date().toISOString();
    const result = await dbService.run(
      'INSERT INTO sales (customer_id, total, payment_method, status, created_at, session_id, card_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sale.customer_id, sale.total, sale.payment_method, sale.status, timestamp, sale.session_id, sale.card_id]
    );
    const saleId = result.changes?.lastId;

    // Guardar ítems
    for (const item of sale.items) {
      await dbService.run(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [saleId, item.id, item.quantity, item.price, item.quantity * item.price]
      );
      // Actualizar stock
      await dbService.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
      
      // Registrar movimiento de venta para los reportes diarios
      await dbService.run(
        'INSERT INTO movements (product_id, product_name, type, quantity, reason, session_id, timestamp) VALUES (?, ?, "sale", ?, ?, ?, ?)',
        [item.id, item.name, item.quantity, 'Venta #' + saleId, sale.session_id, timestamp]
      );
    }
    
    // Guardar pagos (CORRECCIÓN DE PAGOS COMBINADOS)
    if (sale.payments && Array.isArray(sale.payments)) {
      for (const p of sale.payments) {
        await dbService.run(
          'INSERT INTO payments (sale_id, amount, payment_method, payment_date) VALUES (?, ?, ?, ?)',
          [saleId, p.amount, p.method, timestamp]
        );
      }
    } else {
      // Fallback para pagos simples
      await dbService.run(
        'INSERT INTO payments (sale_id, amount, payment_method, payment_date) VALUES (?, ?, ?, ?)',
        [saleId, sale.total, sale.payment_method, timestamp]
      );
    }
    
    return saleId;
  },

  async getSalesBySession(sessionId: number) {
    const result = await dbService.query('SELECT * FROM sales WHERE session_id = ?', [sessionId]);
    const sales = result.values || [];
    
    for (const sale of sales) {
      const pResult = await dbService.query('SELECT * FROM payments WHERE sale_id = ?', [sale.id]);
      sale.payments = (pResult.values || []).map((p: any) => ({
        ...p,
        method: p.payment_method
      }));
      // Obtener items de la venta con nombre del producto
      const iResult = await dbService.query(
        'SELECT si.*, p.name as product_name FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?',
        [sale.id]
      );
      sale.items = iResult.values || [];
    }
    
    return sales;
  },

  async cancelSale(saleId: number) {
    await dbService.run('UPDATE sales SET cancelled = 1 WHERE id = ?', [saleId]);
    // Restaurar stock
    const items = await dbService.query(
      'SELECT si.*, p.name as product_name FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?',
      [saleId]
    );
    for (const item of (items.values || [])) {
      await dbService.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    }
    // Obtener la sesión de la venta para registrar el movimiento de auditoría
    const saleResult = await dbService.query('SELECT session_id FROM sales WHERE id = ?', [saleId]);
    const sessionId = saleResult.values?.[0]?.session_id;
    if (sessionId) {
      for (const item of (items.values || [])) {
        await dbService.run(
          'INSERT INTO movements (product_id, product_name, type, quantity, reason, session_id, timestamp) VALUES (?, ?, "cancellation", ?, ?, ?, ?)',
          [item.product_id, item.product_name || '', item.quantity, 'Anulación Venta #' + saleId, sessionId, new Date().toISOString()]
        );
      }
    }
  },

  async getSessionHistory() {
    const result = await dbService.query('SELECT * FROM sessions WHERE is_closed = 1 AND (deleted IS NULL OR deleted = 0) ORDER BY id DESC');
    return result.values || [];
  },

  async getPreviousDayStats() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);
    const result = await dbService.query(
      `SELECT
        COALESCE(SUM(s.total), 0) as total_sales,
        COALESCE(SUM(si.profit), 0) as total_net,
        COUNT(*) as ticket_count
      FROM sales s
      LEFT JOIN (
        SELECT si.sale_id, SUM((si.unit_price - p.cost) * si.quantity) as profit
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        GROUP BY si.sale_id
      ) si ON si.sale_id = s.id
      WHERE substr(s.created_at, 1, 10) = ? AND (s.cancelled IS NULL OR s.cancelled = 0)`,
      [dateStr]
    );
    const row = result.values?.[0] || {};
    return {
      totalSales: row.total_sales || 0,
      totalNet: row.total_net || 0,
      ticketCount: row.ticket_count || 0,
    };
  },

  async getTodayStats() {
    const today = new Date().toISOString().slice(0, 10);
    const result = await dbService.query(
      `SELECT
        COALESCE(SUM(s.total), 0) as total_sales,
        COALESCE(SUM(CASE WHEN s.payment_method = 'transfer' THEN s.total ELSE 0 END), 0) as total_transfer,
        COALESCE(SUM(CASE WHEN s.payment_method = 'split' THEN s.total ELSE 0 END), 0) as total_split,
        COUNT(*) as ticket_count,
        COALESCE(SUM(CASE WHEN s.cancelled = 1 THEN 1 ELSE 0 END), 0) as cancelled_count,
        COALESCE(SUM(si.profit), 0) as total_net
      FROM sales s
      LEFT JOIN (
        SELECT si.sale_id, SUM((si.unit_price - p.cost) * si.quantity) as profit
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        GROUP BY si.sale_id
      ) si ON si.sale_id = s.id
      WHERE substr(s.created_at, 1, 10) = ? AND (s.cancelled IS NULL OR s.cancelled = 0)`,
      [today]
    );
    const stats = result.values?.[0] || {};

    return {
      totalSales: stats.total_sales || 0,
      totalTransfer: stats.total_transfer || 0,
      totalSplit: stats.total_split || 0,
      totalNet: stats.total_net || 0,
      ticketCount: stats.ticket_count || 0,
      cancelledCount: stats.cancelled_count || 0,
    };
  },

  async getTopProducts(limit: number = 5) {
    const result = await dbService.query(
      `SELECT p.name, SUM(si.quantity) as quantity, SUM(si.subtotal) as total
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE (s.cancelled IS NULL OR s.cancelled = 0)
      GROUP BY si.product_id
      ORDER BY quantity DESC
      LIMIT ?`,
      [limit]
    );
    return result.values || [];
  },

  async getLowStockCount(threshold: number = 5) {
    const result = await dbService.query(
      'SELECT COUNT(*) as count FROM products WHERE stock <= ? AND (deleted IS NULL OR deleted = 0)',
      [threshold]
    );
    return result.values?.[0]?.count || 0;
  },

  async getRecentSales(limit: number = 5) {
    const result = await dbService.query(
      `SELECT id, total, payment_method, created_at
      FROM sales
      WHERE (cancelled IS NULL OR cancelled = 0)
      ORDER BY created_at DESC
      LIMIT ?`,
      [limit]
    );
    return result.values || [];
  },

  async getWeeklySales() {
    const dates: string[] = [];
    const dayLabels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
      dayLabels.push(d.toLocaleDateString('es', { weekday: 'short' }).slice(0, 3));
    }
    const sevenDaysAgo = dates[0];
    const result = await dbService.query(
      `SELECT
        substr(s.created_at, 1, 10) as day,
        COALESCE(SUM(s.total), 0) as total,
        COALESCE(SUM(si.profit), 0) as net
      FROM sales s
      LEFT JOIN (
        SELECT si.sale_id, SUM((si.unit_price - p.cost) * si.quantity) as profit
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        GROUP BY si.sale_id
      ) si ON si.sale_id = s.id
      WHERE substr(s.created_at, 1, 10) >= ? AND (s.cancelled IS NULL OR s.cancelled = 0)
      GROUP BY substr(s.created_at, 1, 10)`,
      [sevenDaysAgo]
    );
    const totalsByDay: Record<string, { total: number; net: number }> = {};
    for (const row of (result.values || [])) {
      totalsByDay[row.day] = { total: row.total || 0, net: row.net || 0 };
    }
    return dates.map((dateStr, i) => ({
      day: dayLabels[i],
      total: totalsByDay[dateStr]?.total || 0,
      net: totalsByDay[dateStr]?.net || 0,
    }));
  },
};
