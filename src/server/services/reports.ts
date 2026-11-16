import { getDb } from '../db';

export interface ReportFilter {
  startDate?: string; // YYYY-MM-DD or ISO string
  endDate?: string;   // YYYY-MM-DD or ISO string
  staffId?: string;
  serviceId?: string;
  status?: string;
}

export class ReportsService {
  private db: any;

  constructor(db?: any) {
    this.db = db || getDb();
  }

  private buildDateWhere(filter: ReportFilter, alias: string = 'a'): { sql: string; params: any[] } {
    let sql = '';
    const params: any[] = [];

    if (filter.startDate) {
      sql += ` AND date(${alias}.start_time) >= date(?)`;
      params.push(filter.startDate);
    }
    if (filter.endDate) {
      sql += ` AND date(${alias}.start_time) <= date(?)`;
      params.push(filter.endDate);
    }
    if (filter.staffId) {
      sql += ` AND ${alias}.staff_id = ?`;
      params.push(filter.staffId);
    }
    if (filter.serviceId) {
      sql += ` AND ${alias}.service_id = ?`;
      params.push(filter.serviceId);
    }
    if (filter.status) {
      sql += ` AND ${alias}.status = ?`;
      params.push(filter.status);
    }

    return { sql, params };
  }

  getOverview(filter: ReportFilter = {}) {
    const { sql, params } = this.buildDateWhere(filter);

    const query = `
      SELECT 
        COUNT(*) as total_appointments,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END), 0) as completed_count,
        COALESCE(SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled_count,
        COALESCE(SUM(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END), 0) as no_show_count,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price_toman ELSE 0 END), 0) as total_revenue_toman,
        COUNT(DISTINCT a.client_id) as unique_clients
      FROM appointments a
      WHERE 1=1 ${sql}
    `;

    const stats = this.db.prepare(query).get(...params);
    const total = stats.total_appointments || 0;
    const completed = stats.completed_count || 0;
    const cancelled = stats.cancelled_count || 0;
    const noShow = stats.no_show_count || 0;
    const revenue = Number(stats.total_revenue_toman || 0);
    const uniqueClients = stats.unique_clients || 0;

    const completionRate = total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : 0;
    const cancelRate = total > 0 ? parseFloat(((cancelled / total) * 100).toFixed(1)) : 0;
    const noShowRate = total > 0 ? parseFloat(((noShow / total) * 100).toFixed(1)) : 0;
    const avgTicket = completed > 0 ? Math.round(revenue / completed) : 0;

    // Calculate New vs Returning clients in period
    let newClients = 0;
    let returningClients = 0;

    if (uniqueClients > 0) {
      const clientIdsQuery = `
        SELECT DISTINCT a.client_id
        FROM appointments a
        WHERE 1=1 ${sql}
      `;
      const clientRows = this.db.prepare(clientIdsQuery).all(...params);

      for (const row of clientRows) {
        // Find first appointment of this client ever
        const firstApt = this.db.prepare(`
          SELECT MIN(date(start_time)) as first_date
          FROM appointments
          WHERE client_id = ?
        `).get(row.client_id);

        if (firstApt && firstApt.first_date) {
          const isNew = filter.startDate ? firstApt.first_date >= filter.startDate.substring(0, 10) : true;
          if (isNew) {
            newClients++;
          } else {
            returningClients++;
          }
        }
      }
    }

    const retentionRate = uniqueClients > 0 ? parseFloat(((returningClients / uniqueClients) * 100).toFixed(1)) : 0;

    return {
      totalAppointments: total,
      completedAppointments: completed,
      cancelledAppointments: cancelled,
      noShowAppointments: noShow,
      totalRevenueToman: revenue,
      averageTicketToman: avgTicket,
      completionRate,
      cancelRate,
      noShowRate,
      uniqueClients,
      newClients,
      returningClients,
      retentionRate
    };
  }

  getRevenueByStaff(filter: ReportFilter = {}) {
    const { sql, params } = this.buildDateWhere(filter, 'a');

    const query = `
      SELECT 
        s.id as staff_id,
        s.name as staff_name,
        s.color as staff_color,
        COUNT(a.id) as appointment_count,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END), 0) as completed_count,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price_toman ELSE 0 END), 0) as total_revenue_toman
      FROM staff s
      LEFT JOIN appointments a ON s.id = a.staff_id ${sql}
      GROUP BY s.id, s.name, s.color
      ORDER BY total_revenue_toman DESC
    `;

    const rows = this.db.prepare(query).all(...params);
    return rows.map((r: any) => ({
      staffId: r.staff_id,
      staffName: r.staff_name,
      staffColor: r.staff_color,
      appointmentCount: r.appointment_count,
      completedCount: r.completed_count,
      totalRevenueToman: Number(r.total_revenue_toman)
    }));
  }

  getRevenueByService(filter: ReportFilter = {}) {
    const { sql, params } = this.buildDateWhere(filter, 'a');

    const query = `
      SELECT 
        srv.id as service_id,
        srv.name as service_name,
        srv.duration_minutes,
        COUNT(a.id) as appointment_count,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END), 0) as completed_count,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price_toman ELSE 0 END), 0) as total_revenue_toman
      FROM services srv
      LEFT JOIN appointments a ON srv.id = a.service_id ${sql}
      GROUP BY srv.id, srv.name, srv.duration_minutes
      ORDER BY total_revenue_toman DESC
    `;

    const rows = this.db.prepare(query).all(...params);
    return rows.map((r: any) => ({
      serviceId: r.service_id,
      serviceName: r.service_name,
      durationMinutes: r.duration_minutes,
      appointmentCount: r.appointment_count,
      completedCount: r.completed_count,
      totalRevenueToman: Number(r.total_revenue_toman)
    }));
  }

  getBusiestHours(filter: ReportFilter = {}) {
    const { sql, params } = this.buildDateWhere(filter, 'a');

    const query = `
      SELECT 
        strftime('%H', a.start_time) as hour,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price_toman ELSE 0 END), 0) as revenue_toman
      FROM appointments a
      WHERE 1=1 ${sql}
      GROUP BY hour
      ORDER BY hour ASC
    `;

    const rows = this.db.prepare(query).all(...params);
    return rows.map((r: any) => ({
      hour: `${r.hour}:00`,
      count: r.count,
      revenueToman: Number(r.revenue_toman)
    }));
  }

  getTopClients(filter: ReportFilter = {}, limit: number = 10) {
    const { sql, params } = this.buildDateWhere(filter, 'a');

    const query = `
      SELECT 
        c.id as client_id,
        c.name as client_name,
        c.phone as client_phone,
        COUNT(a.id) as visit_count,
        COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.price_toman ELSE 0 END), 0) as total_spend_toman,
        MAX(a.start_time) as last_visit
      FROM clients c
      JOIN appointments a ON c.id = a.client_id
      WHERE 1=1 ${sql}
      GROUP BY c.id, c.name, c.phone
      ORDER BY total_spend_toman DESC, visit_count DESC
      LIMIT ?
    `;

    const rows = this.db.prepare(query).all(...params, limit);
    return rows.map((r: any) => ({
      clientId: r.client_id,
      clientName: r.client_name,
      clientPhone: r.client_phone,
      visitCount: r.visit_count,
      totalSpendToman: Number(r.total_spend_toman),
      lastVisit: r.last_visit
    }));
  }

  generateAppointmentsCsv(filter: ReportFilter = {}): string {
    const { sql, params } = this.buildDateWhere(filter, 'a');

    const query = `
      SELECT 
        a.id,
        a.start_time,
        a.end_time,
        c.name as client_name,
        c.phone as client_phone,
        s.name as staff_name,
        srv.name as service_name,
        a.price_toman,
        a.status,
        a.notes
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN staff s ON a.staff_id = s.id
      JOIN services srv ON a.service_id = srv.id
      WHERE 1=1 ${sql}
      ORDER BY a.start_time DESC
    `;

    const rows = this.db.prepare(query).all(...params);

    const statusTranslations: Record<string, string> = {
      confirmed: 'تایید شده',
      completed: 'انجام شده',
      cancelled: 'لغو شده',
      no_show: 'عدم حضور'
    };

    // Include UTF-8 BOM so Excel opens Persian text without encoding corruptions
    let csv = '\uFEFF';
    csv += 'شناسه,تاریخ و زمان,مشتری,شماره تماس,پرسنل,خدمت,مبلغ (تومان),وضعیت,توضیحات\n';

    for (const r of rows) {
      const statusFa = statusTranslations[r.status] || r.status;
      const escape = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

      const line = [
        escape(r.id),
        escape(r.start_time),
        escape(r.client_name),
        escape(r.client_phone),
        escape(r.staff_name),
        escape(r.service_name),
        r.price_toman || 0,
        escape(statusFa),
        escape(r.notes || '')
      ].join(',');

      csv += line + '\n';
    }

    return csv;
  }
}
