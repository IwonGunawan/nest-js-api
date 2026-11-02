# Rencana Fitur Pembayaran QRIS

## Ringkasan Kondisi Saat Ini

Mobile memiliki alur `PaymentList`, kemudian `BillScreen`, `PayScreen`, dan `ReceiptScreen`.

- `BillScreen` mengambil rincian dan nominal tagihan dari `GET /payments/bill`.
- `PayScreen` saat ini menerima pembayaran tunai dan mengirim `cash` serta `saveChange` ke `POST /payments`.
- Backend menghitung tagihan melalui `BillingService`.
- `PaymentsService.create()` membuat pembayaran, detail pembayaran, activity log, serta memperbarui status pemakaian air dalam transaksi database.
- Belum ada entity invoice tersimpan, metode pembayaran, payment intent pending, atau reference dari payment provider.

Source code utama:

- Mobile: `src/screens/payments/BillScreen.tsx`, `PayScreen.tsx`, `src/services/payment.service.ts`, `src/navigation/stacks/PaymentStack.tsx`
- Backend: `src/payments/payment.controller.ts`, `payment.service.ts`, `billing.service.ts`, `src/common/entities/payment.entity.ts`, `payment-detail.entity.ts`

## Rekomendasi Produk

Gunakan dynamic QRIS dari PJP/payment gateway, bukan QR merchant statis. Dynamic QR mengikat nominal dan reference unik ke satu tagihan, sehingga rekonsiliasi otomatis dan status pembayaran dapat diverifikasi.

QRIS sebaiknya membayar nominal penuh. Pertahankan alur tunai yang ada sebagai metode pembayaran terpisah.

## Flow Bisnis Usulan

1. Petugas membuka detail tagihan customer.
2. Petugas memilih QRIS.
3. Backend menghitung ulang tagihan dengan `BillingService`, membuat payment intent, lalu meminta dynamic QRIS ke provider.
4. Mobile menampilkan QR, nominal, dan batas waktu. Pelanggan memindai QR menggunakan aplikasi bank atau e-wallet.
5. Provider mengirim webhook ke backend setelah pembayaran berhasil.
6. Backend memverifikasi webhook, mencatat pembayaran, memperbarui pemakaian air, lalu menyediakan detail struk.
7. Mobile memantau status dari backend dan membuka `ReceiptScreen` hanya setelah backend mengonfirmasi pembayaran.

## Rencana Teknis

### Database

Tambah tabel `payment_intents` untuk setiap percobaan QRIS. Simpan customer, nominal, currency, provider, provider reference, status, QR payload atau image URL, expiry, waktu pembayaran, idempotency key, dan user pembuat.

Simpan snapshot tagihan dan daftar water usage yang dibayar. Pilihan yang disarankan adalah tabel `payment_intent_details` berisi `payment_intent_id`, `water_usage_id`, dan nominal per item. `payment_details` tetap dibuat saat pembayaran final.

Tambahkan `payment_method` dan provider reference pada pembayaran final. Pertahankan makna data lama dan pastikan migrasi tidak mengubah histori pembayaran tunai.

Status intent minimal: `pending`, `paid`, `expired`, `failed`, `cancelled`. Status `paid_conflict` dapat dipakai untuk pembayaran masuk setelah tagihan sudah dibayar lewat metode lain.

### Backend

- Tambah abstraksi provider QRIS untuk membuat transaksi, memvalidasi webhook, dan memeriksa status bila diperlukan.
- Tambah endpoint terautentikasi untuk membuat intent QRIS dan memeriksa status intent.
- Tambah webhook publik dengan validasi signature, merchant, nominal, currency, status, timestamp, dan proteksi replay.
- Webhook harus idempotent. Pengiriman event yang sama berkali-kali hanya boleh memfinalisasi pembayaran sekali.
- Finalisasi pembayaran QRIS harus berjalan dalam database transaction: lock intent dan water usage terkait, validasi status, buat `payments` dan `payment_details`, perbarui status water usage, lalu catat activity log.
- Satukan logic finalisasi tunai dan QRIS agar aturan status serta pencatatan tagihan tidak bercabang.
- Simpan nominal gross tagihan. Catat MDR dan settlement bersih secara terpisah jika dibutuhkan untuk rekonsiliasi.

### Race Condition dan Kegagalan

Tagihan dapat dibayar tunai saat QRIS masih pending, atau webhook dapat terlambat. Batasi satu intent aktif untuk snapshot tagihan yang sama. Saat webhook berhasil, lock dan validasi ulang item tagihan sebelum finalisasi.

Jika pembayaran provider berhasil tetapi tagihan sudah dilunasi melalui metode lain, jangan tandai transaksi normal atau mengabaikan dana. Tandai sebagai konflik dan ikuti prosedur kredit atau refund yang disepakati bisnis.

### Mobile

- Tambahkan pilihan metode pembayaran dari detail tagihan.
- Pertahankan input tunai yang ada.
- Tambahkan screen QRIS berisi QR, nominal, expiry/countdown, dan status.
- Poll endpoint status backend secara berkala saat screen aktif; refresh status saat aplikasi kembali dari background.
- Tampilkan status expired atau gagal beserta aksi membuat QR baru.
- Buka `ReceiptScreen` hanya setelah backend mengembalikan status paid dan payment ID.
- Render QR dari payload atau image URL provider memakai library yang kompatibel dengan Expo SDK project.
- Jangan pernah menyimpan provider secret di mobile app.

### Riwayat dan Rekonsiliasi

- Tampilkan metode pembayaran dan provider reference pada riwayat pembayaran.
- Sediakan laporan backend untuk membandingkan transaksi paid, fee provider, dan settlement bank.
- Tentukan prosedur manual bila webhook gagal atau settlement berbeda.

## Pengujian

- Webhook sukses, gagal, expired, invalid signature, replay, dan duplicate delivery.
- Nominal/currency/reference tidak cocok.
- Webhook terlambat setelah intent expired.
- Pembayaran tunai dan QRIS bersamaan untuk tagihan yang sama.
- Aplikasi kehilangan jaringan setelah pelanggan membayar, lalu pulih melalui status polling.
- MDR dan nominal settlement dibandingkan dengan gross tagihan.
- Pembayaran QRIS melunasi water usage dan menghasilkan struk dengan detail yang sama seperti pembayaran tunai.

## Persiapan Nonteknis

- Pilih PJP yang mendukung dynamic QRIS, webhook, sandbox, laporan settlement, serta dukungan operasional.
- Siapkan aktivasi merchant dan dokumen KYC sesuai persyaratan PJP, termasuk rekening pencairan.
- Siapkan API credentials sandbox dan production, domain HTTPS publik untuk webhook, serta penyimpanan secret pada environment backend.
- Putuskan siapa yang menanggung MDR, jadwal pencairan, batas nominal, masa berlaku QR, refund, pembayaran ganda, dan rekonsiliasi.
- Buat SOP petugas untuk pembayaran pending, QR expired, jaringan putus, webhook terlambat, serta konflik pembayaran.
- Pastikan nama merchant yang tampil di aplikasi bank dikenali pelanggan.

## Keputusan Sebelum Implementasi

- Asumsi flow: petugas menampilkan QR di perangkatnya untuk dipindai pelanggan.
- Rekomendasi pembayaran QRIS: nominal penuh dan tidak menerima pembayaran sebagian.
- Tentukan PJP dan masa berlaku QR. Usulan awal: 5–10 menit, mengikuti kemampuan provider.
- Tentukan kebijakan untuk pembayaran sukses yang masuk setelah tagihan dibayar melalui metode lain.
