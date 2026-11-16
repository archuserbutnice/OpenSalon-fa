import { getDb } from '../db';
import { normalizeIranianPhone } from '../../client/lib/phone';

export interface CreateItemDTO {
  id?: string;
  name: string;
  sku?: string;
  categoryId?: string;
  supplierId?: string;
  unit?: string;
  quantity?: number;
  minQuantity?: number;
  costPriceToman?: number;
  sellingPriceToman?: number;
  isRetail?: boolean;
  isBackbar?: boolean;
  notes?: string;
}

export interface InventoryTransactionDTO {
  id?: string;
  itemId: string;
  transactionType: 'in' | 'out' | 'adjustment' | 'usage_appointment';
  quantity: number;
  unitCostToman?: number;
  referenceId?: string;
  notes?: string;
}

export class InventoryService {
  private db: any;

  constructor(db?: any) {
    this.db = db || getDb();
  }

  listItems(filters: { categoryId?: string; lowStockOnly?: boolean; search?: string } = {}) {
    let sql = `
      SELECT i.*, c.name as category_name, s.name as supplier_name,
        CASE WHEN i.quantity <= i.min_quantity THEN 1 ELSE 0 END as is_low_stock
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.categoryId) {
      sql += ' AND i.category_id = ?';
      params.push(filters.categoryId);
    }
    if (filters.lowStockOnly) {
      sql += ' AND i.quantity <= i.min_quantity';
    }
    if (filters.search) {
      sql += ' AND (i.name LIKE ? OR i.sku LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ' ORDER BY i.name ASC';
    return this.db.prepare(sql).all(...params);
  }

  getItemById(id: string) {
    const sql = `
      SELECT i.*, c.name as category_name, s.name as supplier_name
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.id = ?
    `;
    return this.db.prepare(sql).get(id);
  }

  createItem(data: CreateItemDTO) {
    const id = data.id || 'item_' + Math.random().toString(36).substring(2, 10);
    const sql = `
      INSERT INTO inventory_items (
        id, name, sku, category_id, supplier_id, unit, quantity, min_quantity,
        cost_price_toman, selling_price_toman, is_retail, is_backbar, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    this.db.prepare(sql).run(
      id,
      data.name,
      data.sku || null,
      data.categoryId || null,
      data.supplierId || null,
      data.unit || 'عدد',
      data.quantity || 0,
      data.minQuantity !== undefined ? data.minQuantity : 5,
      data.costPriceToman || 0,
      data.sellingPriceToman || 0,
      data.isRetail ? 1 : 0,
      data.isBackbar ? 1 : 0,
      data.notes || null
    );

    // Initial stock transaction if quantity > 0
    if (data.quantity && data.quantity > 0) {
      this.recordTransaction({
        itemId: id,
        transactionType: 'in',
        quantity: data.quantity,
        unitCostToman: data.costPriceToman || 0,
        notes: 'موجودی اولیه کالا'
      });
    }

    return this.getItemById(id);
  }

  recordTransaction(tx: InventoryTransactionDTO) {
    const item = this.db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(tx.itemId);
    if (!item) {
      throw new Error(`Inventory item ${tx.itemId} not found`);
    }

    const txId = tx.id || 'tx_' + Math.random().toString(36).substring(2, 10);
    let newQty = item.quantity;

    if (tx.transactionType === 'in') {
      newQty += tx.quantity;
    } else if (tx.transactionType === 'out' || tx.transactionType === 'usage_appointment') {
      if (item.quantity < tx.quantity) {
        throw new Error(`Insufficient stock for item ${item.name}: available ${item.quantity}, requested ${tx.quantity}`);
      }
      newQty -= tx.quantity;
    } else if (tx.transactionType === 'adjustment') {
      newQty = tx.quantity;
    }

    const recordTx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO inventory_transactions (
          id, item_id, transaction_type, quantity, unit_cost_toman, reference_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        tx.itemId,
        tx.transactionType,
        tx.quantity,
        tx.unitCostToman || 0,
        tx.referenceId || null,
        tx.notes || null
      );

      this.db.prepare(`
        UPDATE inventory_items
        SET quantity = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newQty, tx.itemId);
    });

    recordTx();
    return {
      transactionId: txId,
      itemId: tx.itemId,
      previousQuantity: item.quantity,
      newQuantity: newQty,
      isLowStock: newQty <= item.min_quantity
    };
  }

  getLowStockAlerts() {
    return this.listItems({ lowStockOnly: true });
  }

  listTransactions(filters: { itemId?: string; limit?: number } = {}) {
    let sql = `
      SELECT t.*, i.name as item_name, i.unit, i.sku
      FROM inventory_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filters.itemId) {
      sql += ' AND t.item_id = ?';
      params.push(filters.itemId);
    }
    sql += ' ORDER BY t.created_at DESC';
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    return this.db.prepare(sql).all(...params);
  }

  listSuppliers() {
    return this.db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
  }

  createSupplier(data: { name: string; contactPerson?: string; phone: string; address?: string; notes?: string }) {
    const normalizedPhone = normalizeIranianPhone(data.phone);
    if (!normalizedPhone) {
      throw new Error('Invalid Iranian phone number');
    }
    const id = 'sup_' + Math.random().toString(36).substring(2, 10);
    this.db.prepare(`
      INSERT INTO suppliers (id, name, contact_person, phone, address, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.contactPerson || null, normalizedPhone, data.address || null, data.notes || null);
    return this.db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  }

  listCategories() {
    return this.db.prepare('SELECT * FROM inventory_categories ORDER BY name ASC').all();
  }
}
