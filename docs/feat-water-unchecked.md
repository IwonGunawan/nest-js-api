# Feat: Customer Water Meter Unchecked

## Summary

Fitur untuk menampilkan customer yang belum dicek kilometer air pada bulan berjalan.

- Menu `Cek Air`: checkbox untuk filter customer yang belum dicek.
- Menu `Home`: detail progress per wilayah bisa diklik untuk membuka daftar customer yang belum dicek pada wilayah tersebut.
- Tidak perlu tabel baru. Status "belum dicek" diturunkan dari `water_usages` bulan berjalan.

## Scope

- Backend: `nest-js-api`
- Frontend: `react-native-mobile`

## Database

Tidak ada tabel baru. Data diturunkan dari:

- `customers`
- `water_usages`
- `village`

`water_usages` bulan berjalan menjadi penanda customer yang sudah dicek.

## Backend Plan

### 1. Timezone WIB

`currentDate()` harus menggunakan timezone `Asia/Jakarta`, bukan waktu server lokal.

Alasan:
- Operasional aplikasi berbasis WIB.
- Server bisa berjalan di timezone lain.

### 2. Filter Unchecked

Endpoint existing:

`GET /water-usage`

Tambah parameter:

- `isUnchecked?: string` dengan `@IsIn(['true', 'false'])`

Konversi ke boolean dilakukan di service: `query.isUnchecked === 'true'`.

Alasan:
- FE mengirim boolean, axios mengubahnya menjadi string query.
- ValidationPipe implicit conversion dapat mengubah string `'false'` menjadi boolean `true`.
- Memakai string di DTO dan konversi eksplisit di service lebih aman.

### 3. Query Strategy

Jangan andalkan `LEFT JOIN` untuk menentukan status checked, terutama untuk filter unchecked.

Gunakan:

- `EXISTS` untuk `isChecked = 1`
- `NOT EXISTS` untuk `isUnchecked = true`

Kondisi subquery:

- `water_usages.customer_id = customers.id`
- `water_usages.month = :month`
- `water_usages.year = :year`
- `water_usages.deleted = '0'`

Alasan:
- Jika ada lebih dari satu `water_usages` per customer pada bulan berjalan, `LEFT JOIN` bisa menduplikasi baris.
- `NOT EXISTS` tetap benar meskipun data duplikat.
- Jika tetap menggunakan `LEFT JOIN`, kondisi `month`, `year`, dan `deleted` wajib berada di `ON clause`, bukan `WHERE`, agar customer unchecked tidak hilang.

### 4. Count Semantics

Query data dan query count harus dibangun dari filter yang identik:

- `villageId`
- `search`
- `isUnchecked`
- bulan berjalan
- tahun berjalan
- `deleted = '0'`

Alasan:
- Mencegah `totalData` tidak sinkron dengan data yang ditampilkan.
- Mencegah bug pagination.

### 5. Progress Per Village

`checkProgress()` harus menghindari duplikasi checked count.

Gunakan perhitungan customer distinct:

- `COUNT(DISTINCT c.id)` untuk total customer.
- `COUNT(DISTINCT CASE WHEN wu.id IS NOT NULL THEN c.id END)` untuk checked customer.

Atau gunakan `EXISTS`.

Alasan:
- `COUNT(DISTINCT wu.id)` bisa lebih besar dari jumlah customer jika satu customer memiliki beberapa record bulan berjalan.

### 6. lastMeter

Tambahkan field `lastMeter` pada response `WaterUsageList`.

Sumber:

- Record `water_usages` terbaru sebelum bulan berjalan.
- Jika meter baru atau diganti (`lastUsed = '1'`), nilai `lastMeter = null`.

Alasan:
- Memberikan referensi meter sebelumnya untuk input.
- Tidak boleh dianggap sebagai pencatatan bulan berjalan.

## Frontend Plan

### 1. Service Contract

`WaterUsageQuery`:

- `isUnchecked?: boolean`

FE mengirim boolean; axios mengubahnya menjadi string query. BE DTO memakai string dan service mengonversi secara eksplisit.

Alasan:
- Kontrak FE tetap boolean.
- Menghindari implicit conversion yang salah.

### 2. Cek Air Screen

- Tambah Checkbox `Belum dicek`.
- Toggle memanggil `updateQuery({ isUnchecked })`.
- Empty state menampilkan pesan sesuai filter.
- Terima route params `villageId` dan `isUnchecked`.

### 3. Initial Filter Dari Navigation

- Hook tetap menjadi satu owner fetch.
- Screen menerapkan route params dengan guard agar tidak double request.
- Perubahan route params harus update query, lalu hook melakukan fetch.

Alasan:
- Menghindari double API request saat mount.
- Memastikan data mengikuti filter baru.

### 4. Home Progress Modal

- Setiap baris wilayah bisa diklik.
- Klik menutup modal terlebih dahulu.
- Setelah modal tertutup, navigasi ke tab `WaterUsage` dengan params:
  - `villageId`
  - `isUnchecked: true`

Alasan:
- Mencegah modal tetap terbuka di atas screen tujuan.
- Filter langsung sesuai wilayah yang dipilih.

### 5. WaterUsageStack Params

Tambah params opsional pada `WaterUsageList`:

- `villageId?: number`
- `isUnchecked?: boolean`

## Testing Scenarios

1. Semua village sudah dicek:
   - progress 100%
   - unchecked kosong
2. Semua village belum dicek:
   - progress 0%
   - unchecked = semua customer
3. Sebagian village sudah dicek:
   - count per village dan total konsisten
4. Kombinasi `villageId` + `isUnchecked`:
   - hanya customer unchecked pada village tersebut
5. Pagination dan count:
   - `totalData` dan `totalPages` sesuai filter
   - tidak ada duplikasi
6. Pergantian bulan:
   - record bulan lama tidak dihitung checked
   - semua customer kembali unchecked
7. Timezone boundary WIB.
8. `lastMeter`:
   - tampil jika ada
   - `null` jika meter baru atau diganti
   - bukan meter bulan berjalan
9. Navigasi Home -> Cek Air:
   - modal tertutup
   - filter village + unchecked aktif
   - satu request
