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
  expiryDate?: string;
  batchNumber?: string;
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

export interface ServiceConsumptionDTO {
  id?: string;
  serviceId: string;
  itemId: string;
  quantityUsed: number;
  unit?: string;
}

export interface InventoryBatchDTO {
  id?: string;
  itemId: string;
  batchNumber: string;
  expiryDate?: string;
  quantity: number;
  costPriceToman?: number;
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
        cost_price_toman, selling_price_toman, is_retail, is_backbar, notes,
        expiry_date, batch_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.notes || null,
      data.expiryDate || null,
      data.batchNumber || null
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

  recordTransaction(tx: InventoryTransactionDTO, options: { allowNegativeStock?: boolean } = {}) {
    const item = this.db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(tx.itemId);
    if (!item) {
      throw new Error(`Inventory item ${tx.itemId} not found`);
    }

    const txId = tx.id || 'tx_' + Math.random().toString(36).substring(2, 10);
    let newQty = item.quantity;

    if (tx.transactionType === 'in') {
      newQty += tx.quantity;
    } else if (tx.transactionType === 'out' || tx.transactionType === 'usage_appointment') {
      if (!options.allowNegativeStock && item.quantity < tx.quantity) {
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

  // --- Smart Inventory Extensions ---

  // Service Consumption Mappings
  setServiceConsumption(dto: { serviceId: string; itemId: string; quantityUsed: number; unit?: string }) {
    const existing = this.db.prepare(
      'SELECT id FROM service_consumptions WHERE service_id = ? AND item_id = ?'
    ).get(dto.serviceId, dto.itemId);

    if (existing) {
      this.db.prepare(`
        UPDATE service_consumptions
        SET quantity_used = ?, unit = ?
        WHERE id = ?
      `).run(dto.quantityUsed, dto.unit || null, existing.id);
      return this.db.prepare(`
        SELECT sc.*, s.name as service_name, i.name as item_name, i.quantity as current_stock, i.unit as item_unit
        FROM service_consumptions sc
        JOIN services s ON sc.service_id = s.id
        JOIN inventory_items i ON sc.item_id = i.id
        WHERE sc.id = ?
      `).get(existing.id);
    }

    const id = 'sc_' + Math.random().toString(36).substring(2, 10);
    this.db.prepare(`
      INSERT INTO service_consumptions (id, service_id, item_id, quantity_used, unit)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, dto.serviceId, dto.itemId, dto.quantityUsed, dto.unit || null);

    return this.db.prepare(`
      SELECT sc.*, s.name as service_name, i.name as item_name, i.quantity as current_stock, i.unit as item_unit
      FROM service_consumptions sc
      JOIN services s ON sc.service_id = s.id
      JOIN inventory_items i ON sc.item_id = i.id
      WHERE sc.id = ?
    `).get(id);
  }

  getServiceConsumptions(serviceId: string) {
    return this.db.prepare(`
      SELECT sc.*, s.name as service_name, i.name as item_name, i.sku as item_sku,
        i.quantity as current_stock, i.unit as item_unit, i.cost_price_toman
      FROM service_consumptions sc
      JOIN services s ON sc.service_id = s.id
      JOIN inventory_items i ON sc.item_id = i.id
      WHERE sc.service_id = ?
      ORDER BY i.name ASC
    `).all(serviceId);
  }

  listAllServiceConsumptions() {
    return this.db.prepare(`
      SELECT sc.*, s.name as service_name, i.name as item_name, i.sku as item_sku,
        i.quantity as current_stock, i.unit as item_unit
      FROM service_consumptions sc
      JOIN services s ON sc.service_id = s.id
      JOIN inventory_items i ON sc.item_id = i.id
      ORDER BY s.name ASC, i.name ASC
    `).all();
  }

  deleteServiceConsumption(id: string) {
    const existing = this.db.prepare('SELECT id FROM service_consumptions WHERE id = ?').get(id);
    if (!existing) {
      throw new Error(`Service consumption mapping ${id} not found`);
    }
    this.db.prepare('DELETE FROM service_consumptions WHERE id = ?').run(id);
    return { success: true, id };
  }

  // Auto-decrement on appointment completion
  processAppointmentConsumption(appointmentId: string) {
    const apt = this.db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
    if (!apt) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }
    if (apt.status !== 'completed') {
      return { processed: false, reason: 'Appointment not completed', itemsConsumed: [] };
    }

    // Check if already processed
    const alreadyProcessed = this.db.prepare(
      'SELECT COUNT(*) as count FROM appointment_consumption_logs WHERE appointment_id = ?'
    ).get(appointmentId);
    if (alreadyProcessed && alreadyProcessed.count > 0) {
      return { processed: false, reason: 'Already processed', itemsConsumed: [] };
    }

    // Find mapped consumption items
    const mappings = this.db.prepare(`
      SELECT sc.*, i.name as item_name, i.cost_price_toman, i.quantity as stock_quantity
      FROM service_consumptions sc
      JOIN inventory_items i ON sc.item_id = i.id
      WHERE sc.service_id = ?
    `).all(apt.service_id);

    if (!mappings || mappings.length === 0) {
      return { processed: true, itemsConsumed: [], note: 'No inventory consumption configured for this service' };
    }

    const itemsConsumed: any[] = [];

    const runConsumption = this.db.transaction(() => {
      for (const m of mappings) {
        const qtyToDeduct = Math.ceil(m.quantity_used);
        const txId = 'tx_' + Math.random().toString(36).substring(2, 10);
        const logId = 'log_' + Math.random().toString(36).substring(2, 10);

        // Record transaction
        this.db.prepare(`
          INSERT INTO inventory_transactions (
            id, item_id, transaction_type, quantity, unit_cost_toman, reference_id, notes
          ) VALUES (?, ?, 'usage_appointment', ?, ?, ?, ?)
        `).run(
          txId,
          m.item_id,
          qtyToDeduct,
          m.cost_price_toman || 0,
          appointmentId,
          `مصرف خودکار در نوبت ${appointmentId}`
        );

        // Update item quantity (allow negative stock so salon operation is never blocked)
        this.db.prepare(`
          UPDATE inventory_items
          SET quantity = quantity - ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(qtyToDeduct, m.item_id);

        // Record in appointment_consumption_logs
        this.db.prepare(`
          INSERT INTO appointment_consumption_logs (
            id, appointment_id, item_id, quantity, unit_cost_toman, transaction_id
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          logId,
          appointmentId,
          m.item_id,
          qtyToDeduct,
          m.cost_price_toman || 0,
          txId
        );

        itemsConsumed.push({
          itemId: m.item_id,
          itemName: m.item_name,
          quantity: qtyToDeduct,
          transactionId: txId
        });
      }
    });

    runConsumption();

    return {
      processed: true,
      appointmentId,
      itemsConsumed
    };
  }

  // Days-to-stockout calculation (deterministic burn rate based on lookback days, default 30)
  calculateDaysToStockout(itemId: string, lookbackDays: number = 30) {
    const item = this.db.prepare('SELECT id, name, quantity, min_quantity, cost_price_toman FROM inventory_items WHERE id = ?').get(itemId);
    if (!item) {
      throw new Error(`Inventory item ${itemId} not found`);
    }

    const usageRow = this.db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total_used
      FROM inventory_transactions
      WHERE item_id = ?
        AND transaction_type IN ('out', 'usage_appointment')
        AND created_at >= datetime('now', '-' || ? || ' days')
    `).get(itemId, lookbackDays);

    const totalUsed = usageRow ? usageRow.total_used : 0;
    const dailyBurnRate = totalUsed / lookbackDays;
    let daysToStockout: number | null = null;

    if (item.quantity <= 0) {
      daysToStockout = 0;
    } else if (dailyBurnRate > 0) {
      daysToStockout = Math.floor(item.quantity / dailyBurnRate);
    } else {
      daysToStockout = null; // No usage history in lookback window
    }

    return {
      itemId: item.id,
      itemName: item.name,
      currentQuantity: item.quantity,
      minQuantity: item.min_quantity,
      lookbackDays,
      totalUsedInPeriod: totalUsed,
      dailyBurnRate: parseFloat(dailyBurnRate.toFixed(2)),
      daysToStockout
    };
  }

  // Reorder Suggestions (Deterministic logic)
  getReorderSuggestions(lookbackDays: number = 30) {
    const items = this.db.prepare(`
      SELECT i.*, s.name as supplier_name, s.phone as supplier_phone, c.name as category_name
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      ORDER BY i.name ASC
    `).all();

    const suggestions: any[] = [];

    for (const item of items) {
      const stats = this.calculateDaysToStockout(item.id, lookbackDays);
      const isBelowMin = item.quantity <= item.min_quantity;
      const isStockoutSoon = stats.daysToStockout !== null && stats.daysToStockout <= 7;

      if (isBelowMin || isStockoutSoon) {
        // Target stock calculation: 30-day burn demand or double min_quantity (at least 5)
        const thirtyDayDemand = Math.ceil(stats.dailyBurnRate * 30);
        const targetStock = Math.max(item.min_quantity * 2, thirtyDayDemand, 5);
        const suggestedQuantity = Math.max(1, targetStock - item.quantity);
        const estimatedCostToman = suggestedQuantity * item.cost_price_toman;

        let reason = '';
        let urgency = 'medium';

        if (item.quantity <= 0) {
          reason = 'اتمام موجودی';
          urgency = 'critical';
        } else if (stats.daysToStockout !== null && stats.daysToStockout <= 3) {
          reason = `اتمام موجودی در کمتر از ${stats.daysToStockout} روز`;
          urgency = 'high';
        } else if (isBelowMin) {
          reason = 'موجودی کمتر از نقطه سفارش (حداقل موجودی)';
          urgency = 'medium';
        } else {
          reason = `اتمام موجودی تخمینی طی ${stats.daysToStockout} روز`;
          urgency = 'low';
        }

        suggestions.push({
          itemId: item.id,
          itemName: item.name,
          sku: item.sku,
          unit: item.unit,
          categoryName: item.category_name,
          supplierId: item.supplier_id,
          supplierName: item.supplier_name,
          supplierPhone: item.supplier_phone,
          currentQuantity: item.quantity,
          minQuantity: item.min_quantity,
          dailyBurnRate: stats.dailyBurnRate,
          daysToStockout: stats.daysToStockout,
          targetStock,
          suggestedQuantity,
          costPriceToman: item.cost_price_toman,
          estimatedCostToman,
          urgency,
          reason
        });
      }
    }

    const urgencyOrder: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };
    suggestions.sort((a, b) => (urgencyOrder[a.urgency] || 99) - (urgencyOrder[b.urgency] || 99));

    return suggestions;
  }

  // Inventory Valuation Report
  getValuationReport() {
    const summary = this.db.prepare(`
      SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(quantity), 0) as total_quantity,
        COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity * cost_price_toman ELSE 0 END), 0) as total_cost_value_toman,
        COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity * selling_price_toman ELSE 0 END), 0) as total_retail_value_toman,
        COALESCE(SUM(CASE WHEN quantity <= min_quantity AND quantity > 0 THEN 1 ELSE 0 END), 0) as low_stock_count,
        COALESCE(SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END), 0) as out_of_stock_count
      FROM inventory_items
    `).get();

    const categoryBreakdown = this.db.prepare(`
      SELECT 
        COALESCE(c.id, 'uncategorized') as category_id,
        COALESCE(c.name, 'دسته‌بندی نشده') as category_name,
        COUNT(i.id) as item_count,
        COALESCE(SUM(i.quantity), 0) as total_quantity,
        COALESCE(SUM(CASE WHEN i.quantity > 0 THEN i.quantity * i.cost_price_toman ELSE 0 END), 0) as cost_value_toman,
        COALESCE(SUM(CASE WHEN i.quantity > 0 THEN i.quantity * i.selling_price_toman ELSE 0 END), 0) as retail_value_toman
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY cost_value_toman DESC
    `).all();

    const expiringSoon = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM inventory_batches
      WHERE expiry_date IS NOT NULL
        AND date(expiry_date) <= date('now', '+30 days')
        AND quantity > 0
    `).get();

    const totalCostValue = Number(summary.total_cost_value_toman);
    const totalRetailValue = Number(summary.total_retail_value_toman);

    return {
      totalItems: summary.total_items,
      totalQuantity: summary.total_quantity,
      totalCostValueToman: totalCostValue,
      totalRetailValueToman: totalRetailValue,
      potentialProfitToman: totalRetailValue - totalCostValue,
      lowStockCount: summary.low_stock_count,
      outOfStockCount: summary.out_of_stock_count,
      expiringSoonCount: expiringSoon ? expiringSoon.count : 0,
      categories: categoryBreakdown.map((cat: any) => ({
        categoryId: cat.category_id,
        categoryName: cat.category_name,
        itemCount: cat.item_count,
        totalQuantity: cat.total_quantity,
        costValueToman: Number(cat.cost_value_toman),
        retailValueToman: Number(cat.retail_value_toman),
        profitToman: Number(cat.retail_value_toman) - Number(cat.cost_value_toman)
      }))
    };
  }

  // Batches & Expiry Management
  createBatch(data: InventoryBatchDTO) {
    const item = this.db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(data.itemId);
    if (!item) {
      throw new Error(`Inventory item ${data.itemId} not found`);
    }

    const id = data.id || 'batch_' + Math.random().toString(36).substring(2, 10);
    const cost = data.costPriceToman !== undefined ? data.costPriceToman : item.cost_price_toman;

    const create = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO inventory_batches (id, item_id, batch_number, expiry_date, quantity, cost_price_toman)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, data.itemId, data.batchNumber, data.expiryDate || null, data.quantity, cost);

      if (data.quantity > 0) {
        this.recordTransaction({
          itemId: data.itemId,
          transactionType: 'in',
          quantity: data.quantity,
          unitCostToman: cost,
          referenceId: id,
          notes: `ورود سری ساخت (بچ) ${data.batchNumber}`
        });
      }
    });

    create();
    return this.db.prepare(`
      SELECT b.*, i.name as item_name, i.unit
      FROM inventory_batches b
      JOIN inventory_items i ON b.item_id = i.id
      WHERE b.id = ?
    `).get(id);
  }

  listBatches(itemId?: string) {
    let sql = `
      SELECT b.*, i.name as item_name, i.unit, i.sku
      FROM inventory_batches b
      JOIN inventory_items i ON b.item_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (itemId) {
      sql += ' AND b.item_id = ?';
      params.push(itemId);
    }
    sql += ' ORDER BY b.expiry_date ASC, b.created_at DESC';
    return this.db.prepare(sql).all(...params);
  }

  getExpiringBatches(daysAhead: number = 30) {
    const sql = `
      SELECT b.*, i.name as item_name, i.unit, i.sku
      FROM inventory_batches b
      JOIN inventory_items i ON b.item_id = i.id
      WHERE b.expiry_date IS NOT NULL
        AND date(b.expiry_date) <= date('now', '+' || ? || ' days')
        AND b.quantity > 0
      ORDER BY b.expiry_date ASC
    `;
    return this.db.prepare(sql).all(daysAhead);
  }
}
