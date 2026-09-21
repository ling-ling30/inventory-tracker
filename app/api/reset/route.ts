import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export async function POST() {
  try {
    await queryD1('DELETE FROM handover_logs');
    await queryD1('DELETE FROM items');
    await queryD1('DELETE FROM users');
    await queryD1('DELETE FROM categories');

    await queryD1(`
      INSERT INTO categories (id, name, code_prefix, fields) VALUES
      ('Laptop', 'Laptop', 'LAP', '[{"key":"brand","label":"Brand & Model","type":"text","required":true},{"key":"processor","label":"Processor","type":"text","required":true},{"key":"year","label":"Year","type":"number","required":false}]'),
      ('General', 'General', 'GEN', '[{"key":"item","label":"Item Name","type":"text","required":true},{"key":"brand","label":"Brand","type":"text","required":false},{"key":"type","label":"Type / Model","type":"text","required":false}]'),
      ('Phone', 'Phone', 'PHN', '[{"key":"brand","label":"Brand & Model","type":"text","required":true}]'),
      ('Provider', 'Provider', 'PRV', '[{"key":"provider_name","label":"Provider / Vendor Name","type":"text","required":true}]');

      INSERT INTO users (id, user_name, job_title, department) VALUES
      ('usr-1', 'Bambang Sudirman', 'Senior GA Lead', 'General Affairs'),
      ('usr-2', 'Siti Rahma', 'Operations Specialist', 'Operations'),
      ('usr-3', 'Ahmad Fauzi', 'IT Support Specialist', 'Technology');

      INSERT INTO items (id, asset_tag, category_id, status, assigned_user_id, location, notes, details) VALUES
      ('itm-1', 'LAP-001', 'Laptop', 'In Use', 'usr-1', 'Room 402', 'Primary workstation', '{"brand":"ThinkPad T14 Gen 4","processor":"Intel Core i7-1365U","year":2024}'),
      ('itm-2', 'LAP-002', 'Laptop', 'In Storage', NULL, 'Storage Locker B', 'Spare unit', '{"brand":"MacBook Air M2","processor":"Apple M2","year":2023}'),
      ('itm-3', 'PHN-001', 'Phone', 'In Use', 'usr-2', 'Field Office', 'Company hotline phone', '{"brand":"Samsung Galaxy A54"}'),
      ('itm-4', 'GEN-001', 'General', 'In Use', 'usr-1', 'Main Hall', 'Conference room projector', '{"item":"Epson Laser Projector","brand":"Epson","type":"EB-L210W"}'),
      ('itm-5', 'PRV-001', 'Provider', 'Available', NULL, 'Server Room', 'Office internet leased line', '{"provider_name":"Telkom Indonesia / Indihome Corporate"}');

      INSERT INTO handover_logs (id, item_id, from_user, to_user, notes, created_at) VALUES
      ('log-1', 'itm-1', 'Storage / Pool', 'Bambang Sudirman', 'Initial deployment for GA lead', '2026-09-15 09:00:00'),
      ('log-2', 'itm-3', 'Storage / Pool', 'Siti Rahma', 'Assigned for operational duty', '2026-09-18 10:30:00');
    `);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
