# SuaraKu AI - Voice Clone & Text-to-Speech Studio

Aplikasi full-stack berbasis **React + Vite + Express + Google Gemini API (`@google/genai`)** untuk mengunggah atau merekam sampel suara, menganalisis karakteristik akustik vokal ($F_0$ Pitch, Formant, Timbre, Transkripsi), dan menghasilkan ucapan Text-to-Speech (TTS) yang diselaraskan dengan karakter suara Anda.

---

## Persyaratan Sistem (Prerequisites)

Pastikan komputer Anda sudah terinstal:
1. **Node.js** versi **18.x** atau **20.x+** (disarankan versi LTS terbaru dari [nodejs.org](https://nodejs.org/)).
2. **Gemini API Key** yang dapat dibuat secara gratis atau berbayar melalui [Google AI Studio](https://aistudio.google.com/apikey).

---

## Langkah-Langkah Menjalankan di Komputer Lokal (Localhost)

### 1. Unduh atau Clone Proyek
- Dari Google AI Studio, klik tombol **Download / Export ZIP** (atau *Push to GitHub*), lalu ekstrak folder proyek ke komputer Anda.
- Buka terminal (Command Prompt / PowerShell / Terminal macOS / Linux) dan arahkan ke folder proyek:
  ```bash
  cd suaraku-ai
  ```

### 2. Instal Semua Dependensi
Jalankan perintah berikut untuk mengunduh semua paket yang dibutuhkan (`express`, `react`, `vite`, `@google/genai`, dll.):
```bash
npm install
```

### 3. Konfigurasi File `.env` (API Key Gemini)
1. Salin file `.env.example` menjadi file baru bernama `.env` di folder utama proyek:
   - **Windows (CMD)**: `copy .env.example .env`
   - **macOS / Linux / Git Bash**: `cp .env.example .env`
2. Buka file `.env` menggunakan teks editor ( seperti VS Code atau Notepad) dan masukkan API Key Gemini Anda:
   ```env
   GEMINI_API_KEY="AIzaSyYourActualGeminiApiKeyHere"
   PORT=3000
   ```

### 4. Jalankan Server Pengembangan (Development Mode)
Jalankan perintah berikut:
```bash
npm run dev
```
Server Express + Vite akan otomatis berjalan di:
👉 **`http://localhost:3000`**

Buka alamat `http://localhost:3000` di browser Anda (Chrome, Edge, Brave, atau Firefox).

---

## Model Gemini yang Digunakan di Server (`server.ts`)

Seluruh pemanggilan model Gemini dilakukan secara aman di sisi server (`server.ts`) menggunakan SDK resmi `@google/genai`:
- **`gemini-3.5-transcribe`** (`/api/transcribe`): Mentranskripsikan file audio yang diunggah (`.mp3`, `.wav`, `.m4a`, `.webm`).
- **`gemini-3.8-flash`** (`/api/analyze-voice`): Menganalisis profil akustik vokal dan merekomendasikan konfigurasi persona serta offset DSP.
- **`gemini-3.8-flash-lite-tts` & `gemini-3.8-flash-tts`** (`/api/tts`): Menghasilkan audio ucapan (WAV 24kHz 16-bit mono) dari teks Bahasa Indonesia maupun multibahasa.

---

## Menjalankan untuk Produksi (Production Build)

Jika Anda ingin mem-build frontend menjadi file statis yang dioptimasi:
```bash
npm run build
NODE_ENV=production npm start
```
# voice-generator
