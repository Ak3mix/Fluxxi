import { dbService } from '../database';

export const CardRepository = {
  async getAll() {
    const res = await dbService.query('SELECT * FROM cards WHERE deleted = 0;');
    return res.values || [];
  },
  async add(card: { name: string; bank: string; account_number: string }) {
    await dbService.run('INSERT INTO cards (name, bank, account_number) VALUES (?, ?, ?);', [card.name, card.bank, card.account_number]);
    return true;
  },
  async update(id: number, card: { name: string; bank: string; account_number: string }) {
    await dbService.run('UPDATE cards SET name = ?, bank = ?, account_number = ? WHERE id = ?;', [card.name, card.bank, card.account_number, id]);
    return true;
  },
  async delete(id: number) {
    await dbService.run('UPDATE cards SET deleted = 1 WHERE id = ?;', [id]);
    return true;
  }
};
