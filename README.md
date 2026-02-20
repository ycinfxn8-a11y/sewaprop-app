# SewaProp: Sistem Manajemen Properti Film

SewaProp hadir sebagai solusi digital untuk mengatasi kerumitan manajemen logistik di industri film. Aplikasi berbasis web ini dirancang khusus bagi pemilik prop house untuk menyederhanakan pengelolaan stok, akurasi pencatatan transaksi, hingga pemantauan status pengembalian barang dalam satu platform yang intuitif.

## 🔗 Demo Aplikasi

Anda dapat mencoba langsung aplikasi ini melalui tautan berikut: [**https://sewaprop-app.netlify.app/**](https://sewaprop-app.netlify.app/ "null")

## 🚀 Fitur Utama

### 1\. Manajemen Inventaris (Inventory Management)

-   **Data Barang**: Menyimpan nama, kategori (Senjata, Kostum, Peralatan, dll), harga sewa per hari, dan jumlah stok.
-   **Kontrol Inventaris Penuh**: Kelola data properti dengan fleksibel melalui fitur tambah, edit, dan hapus barang yang dapat diperbarui secara seketika (_real-time_).
-   **Pelacakan Stok Otomatis**: Stok akan berkurang saat disewakan dan bertambah kembali secara otomatis saat barang dikembalikan.

### 2\. Sistem Kasir (Point of Sale)

-   **Keranjang Belanja**: Menambahkan beberapa item ke dalam satu daftar sewa.
-   **Kalkulasi Otomatis**: Menghitung subtotal berdasarkan durasi sewa (hari) dan menerapkan diskon persentase.
-   **Pencarian Cepat**: Filter barang berdasarkan nama untuk mempercepat proses transaksi.

### 3\. Riwayat Transaksi & Pelacakan

-   **Status Sewa**: Melacak transaksi yang berstatus "Dipinjam" atau "Dikembalikan".
-   **Log Waktu**: Mencatat tanggal transaksi dan tanggal pengembalian secara presisi.

## ✨ Manfaat Utama

-   **Efisiensi Operasional**: Memangkas waktu pencatatan manual dan meminimalisir kesalahan manusia (human error).
-   **Aksesibilitas Tinggi**: Desain responsif memungkinkan pengelolaan dari perangkat apa pun, baik di gudang (mobile) maupun di kantor (desktop).
-   **Offline-Ready**: Berkat IndexedDB, aplikasi tetap stabil meskipun koneksi internet tidak menentu.

## 🛠 Teknologi & Arsitektur

### Modern Frontend Stack

-   **React.js**: Digunakan untuk membangun antarmuka pengguna yang reaktif dan komponen-basi.
-   **Tailwind CSS**: Memberikan desain UI yang modern, bersih, dan sepenuhnya responsif (nyaman di HP maupun Desktop).
-   **Lucide React**: Library ikon untuk navigasi visual yang intuitif.

### Sistem Penyimpanan: IndexedDB

Berbeda dengan aplikasi web biasa yang kehilangan data saat di-_refresh_, SewaProp menggunakan **IndexedDB**:

-   **Database Lokal Browser**: Data disimpan di dalam memori permanen browser pengguna.
-   **Persistensi Tinggi**: Data tetap ada meskipun browser ditutup, komputer dimatikan, atau halaman dimuat ulang.
-   **Mandiri & Privat (Serverless)**: Seluruh data diproses dan disimpan di perangkat Anda tanpa perlu database eksternal (seperti MySQL). Hal ini menjamin privasi data yang lebih baik, kecepatan akses maksimal, serta nol biaya pemeliharaan server.

## 🛠 Cara Kerja Penyimpanan Data

1.  **Inisialisasi**: Saat aplikasi pertama kali dibuka, sistem memeriksa apakah database `SewaPropDB_V2` sudah ada. Jika belum, sistem membuat dua _Object Stores_ (tabel): `inventory` dan `transactions`.
2.  **Operasi Asinkron**: Semua penulisan data menggunakan pola _asynchronous_ untuk memastikan antarmuka (UI) tidak membeku (_freeze_) saat memproses data besar.
3.  **Sinkronisasi State**: Setiap perubahan pada database IndexedDB akan langsung direfleksikan ke State React, menjaga tampilan tetap mutakhir.

## ⚠️ Catatan Penting

-   **Penyimpanan Spesifik Browser**: Karena menggunakan IndexedDB, data yang Anda masukkan di Google Chrome tidak akan muncul di Firefox atau di perangkat lain.
-   **Keamanan Context**: Fitur penyimpanan ini memerlukan koneksi **HTTPS** agar dapat berfungsi dengan stabil di lingkungan produksi.

### 🛠️ Langkah Cepat Memulai

1.  Tambahkan daftar properti Anda di tab **Inventaris**.
2.  Mulai transaksi baru di tab **Kasir**.
3.  Pantau dan selesaikan pengembalian di tab **Transaksi**.

# Rangkuman Update Aplikasi Sewa Properti Film

### 1\. Perbaikan Bug "Batal Kembalikan"

-   **Masalah:** Penekanan tombol "Batal Kembalikan" tidak mensinkronkan data stok di database IndexedDB dengan benar, sehingga tampilan tidak berubah.
-   **Solusi:** Sinkronisasi ganda pada fungsi `handleUndoReturn` dengan validasi stok gudang sebelum mengubah status transaksi kembali menjadi 'Dipinjam'.

### 2\. Perbaikan Bug Diskon & Input Angka

-   **Bug Diskon Persen:** Memperbaiki logika kalkulasi dan tampilan agar persentase diskon terhitung dengan benar terhadap subtotal sebelum ditampilkan pada ringkasan biaya.
-   **Input Tidak Bisa Dihapus:** Memperbaiki kendala di mana angka pada kolom "Hari" dan "Diskon" tidak bisa dihapus total (kosong).
-   **Solusi:** Menggunakan state string untuk input dan menambahkan fungsi `onBlur`. Jika pengguna mengosongkan kolom, sistem secara otomatis memberikan nilai default (1 untuk hari, 0 untuk diskon) agar tidak merusak perhitungan sistem.

### 3\. Batasan Tampilan Item Kasir

-   **Update:** Daftar inventaris di halaman Kasir kini dibatasi maksimal **12 item** saja saat pertama kali dibuka tanpa pencarian.
-   **Tujuan:** Meningkatkan performa _rendering_ dan menjaga antarmuka tetap bersih. Pengguna dapat menggunakan fitur **Pencarian** untuk melihat item lainnya.

### 4\. Validasi & Input Data Penyewa

-   **Penambahan Field:** Menambahkan input **Nomor WhatsApp** (No. HP) penyewa di form checkout.
-   **Modal Alert Kustom:** Mengganti `alert()` bawaan browser dengan **Modal Alert Kustom** yang muncul jika Nama atau No. HP belum diisi saat proses simpan transaksi.

### 5\. Peningkatan UI/UX

-   **Status Indicator:** Indikator garis warna pada kartu transaksi (Amber untuk Dipinjam, Hijau untuk Dikembalikan).
-   **Auto-Format:** Nama penyewa otomatis dikonversi ke huruf kapital (Uppercase) untuk kerapihan administrasi.


© 2024 SewaProp Team - Sistem Manajemen Properti Film Profesional.



