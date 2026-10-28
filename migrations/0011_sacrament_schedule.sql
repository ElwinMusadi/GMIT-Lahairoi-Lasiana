-- Migration number: 0011
-- Pendaftaran sakramen: jadwal konseling/penggembalaan, jam pelaksanaan, dan mempelai
-- kedua pada pemberkatan nikah.

-- Jadwal konseling/penggembalaan (status COUNSELING), format tanggal dan HH:MM WITA.
ALTER TABLE sacrament_applications
  ADD COLUMN counseling_date TEXT CHECK (date(counseling_date) IS counseling_date);
ALTER TABLE sacrament_applications
  ADD COLUMN counseling_time TEXT CHECK (strftime('%H:%M', counseling_time) IS counseling_time);

-- Jam pelaksanaan sakramen, pelengkap scheduled_date.
ALTER TABLE sacrament_applications
  ADD COLUMN scheduled_time TEXT CHECK (strftime('%H:%M', scheduled_time) IS scheduled_time);

-- Pemberkatan nikah: member_id = mempelai pria, partner_member_id = mempelai wanita.
-- Keduanya diperbarui status pernikahannya saat pendaftaran selesai.
ALTER TABLE sacrament_applications
  ADD COLUMN partner_member_id INTEGER REFERENCES members (id) ON DELETE SET NULL;

CREATE INDEX idx_sacrament_applications_partner_member_id
  ON sacrament_applications (partner_member_id);
