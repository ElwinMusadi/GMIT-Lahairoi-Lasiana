-- Migration number: 0010
-- Satu Kartu Keluarga hanya memiliki satu Kepala Keluarga yang masih aktif.
-- Kepala keluarga yang pindah atau meninggal tetap tercatat dengan hubungan HEAD
-- sebagai riwayat, sehingga anggota lain dapat menggantikannya.

CREATE UNIQUE INDEX idx_members_one_active_head ON members (family_id)
WHERE family_relation = 'HEAD' AND status = 'ACTIVE';
