UPDATE putusan_pajak
SET amar_putusan = CASE 
    -- Kelompok Menolak
    WHEN amar_putusan ILIKE '%tolak%' THEN 'Menolak'
    
    -- Kelompok Mengabulkan Seluruhnya
    WHEN amar_putusan ILIKE '%seluruh%' 
         OR amar_putusan IN ('kabul', 'Kabul', 'Mengabulkan', 'mengabulkan') 
         OR amar_putusan ILIKE '%menerima dan mengabulkan%seluruhnya%' THEN 'Mengabulkan Seluruhnya'
    
    -- Kelompok Mengabulkan Sebagian
    WHEN amar_putusan ILIKE '%sebagian%' THEN 'Mengabulkan Sebagian'
    
    -- Kelompok Membatalkan
    WHEN amar_putusan ILIKE '%batal%' THEN 'Membatalkan'
    
    -- Kelompok Tidak Dapat Diterima
    WHEN amar_putusan ILIKE '%tidak dapat diterima%' THEN 'Tidak Dapat Diterima'
    
    -- Kelompok Lain-lain (Termasuk Null dan redundansi lainnya)
    WHEN amar_putusan IS NULL 
         OR amar_putusan IN ('null', 'lainnya', 'Lain-lain', 'Lainnya') 
         OR amar_putusan ILIKE '%menguatkan%' 
         OR amar_putusan ILIKE '%menambah pajak%' THEN 'Lain-lain'
    
    ELSE 'Lain-lain'
END;

DELETE FROM putusan_pajak 
WHERE id IN (1, 366, 251, 1040, 939);
