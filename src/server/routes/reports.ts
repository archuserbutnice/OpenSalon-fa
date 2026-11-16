import { Hono } from 'hono';
import { ReportsService, ReportFilter } from '../services/reports';

export const reportsRouter = new Hono();
const service = new ReportsService();

function extractFilters(c: any): ReportFilter {
  return {
    startDate: c.req.query('start_date'),
    endDate: c.req.query('end_date'),
    staffId: c.req.query('staff_id'),
    serviceId: c.req.query('service_id'),
    status: c.req.query('status')
  };
}

reportsRouter.get('/overview', (c) => {
  const filter = extractFilters(c);
  const overview = service.getOverview(filter);
  return c.json({ success: true, data: overview });
});

reportsRouter.get('/revenue-by-staff', (c) => {
  const filter = extractFilters(c);
  const staffRevenue = service.getRevenueByStaff(filter);
  return c.json({ success: true, count: staffRevenue.length, data: staffRevenue });
});

reportsRouter.get('/revenue-by-service', (c) => {
  const filter = extractFilters(c);
  const serviceRevenue = service.getRevenueByService(filter);
  return c.json({ success: true, count: serviceRevenue.length, data: serviceRevenue });
});

reportsRouter.get('/busiest-hours', (c) => {
  const filter = extractFilters(c);
  const busiest = service.getBusiestHours(filter);
  return c.json({ success: true, count: busiest.length, data: busiest });
});

reportsRouter.get('/top-clients', (c) => {
  const filter = extractFilters(c);
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 10;
  const topClients = service.getTopClients(filter, limit);
  return c.json({ success: true, count: topClients.length, data: topClients });
});

reportsRouter.get('/export-csv', (c) => {
  const filter = extractFilters(c);
  const csvData = service.generateAppointmentsCsv(filter);

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="salon-report-appointments.csv"');
  return c.text(csvData);
});
