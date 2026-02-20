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

© 2024 SewaProp Team - Sistem Manajemen Properti Film Profesional.



