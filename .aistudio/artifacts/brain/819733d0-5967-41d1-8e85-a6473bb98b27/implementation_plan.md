# Fitur Upload File Suara & Auto-Sync Text to Speech

Memungkinkan pengguna mengunggah file rekaman audio pribadi (MP3, WAV, M4A, OGG, WebM) melalui drag-and-drop atau file picker, mendengarkan preview, menganalisis karakteristik vokal (Pitch F0, Timbre, Artikulasi) secara otomatis, dan langsung menerapkannya ke generator Text-to-Speech.

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi pengguna pada sesi tanya jawab:
> - **Format File Didukung**: File rekaman audio standar seperti MP3, WAV, M4A, dan OGG (maksimal 25 MB).
> - **Alur Kerja Utama**: Langsung memproses analisis vokal dan menyelaraskannya ke Text-to-Speech studio untuk segera diuji coba.
> - **Dukungan Contoh Suara**: Ditambahkan opsi 2 sampel vokal Indonesia (Pria & Wanita) bagi pengguna yang ingin langsung mencoba tanpa file lokal.

---

### 1. Overview & Core Concept

- **What It Does**: Memperluas studio dengan zona upload audio interaktif (*drag & drop*), pemutar preview instan dengan waveform, ekstraksi profil vokal via Web Audio API & Gemini AI, serta transisi otomatis ke Text-to-Speech.
- **Target Audience**: Pengguna atau kreator yang sudah memiliki rekaman suara dari voice recorder handphone, podcast, atau rekaman mic studio terpisah dan ingin mengubahnya menjadi suara TTS.
- **Key Value**: Pengguna tidak wajib merekam live via mikrofon browser; mereka bisa memakai rekaman terbaik yang sudah ada untuk mendapatkan profil kloning suara.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. Pengguna membuka tab **1. Rekam & Profil Suara**.
  2. Memilih mode **"Upload File Suara"** atau langsung menjatuhkan file (`.mp3`, `.wav`, `.m4a`) ke area *Dropzone*.
  3. Sistem memvalidasi ukuran & format file, memuat audio ke *Web Audio Context*, dan menampilkan visual waveform beserta info durasi & ukuran.
  4. Pengguna menekan tombol **"Analisis & Hubungkan ke TTS"**.
  5. Gemini mentranskripsikan isi rekaman dan memetakan nada dasar ($F_0$), tipe vokal (*Baritone/Tenor/Alto/Soprano*), serta *rekomendasi tuning DSP*.
  6. Aplikasi otomatis menampilkan hasil profil dan mengaktifkan generator Text-to-Speech yang telah disinkronkan.
- **Visual Identity**:
  - Dark studio aesthetic berstandar SaaS modern (slate-950 canvas, border slate-800, aksen indigo-500).
  - Dropzone responsif dengan efek drag-over glowing, ikon audio, dan daftar format yang didukung.
  - Zero-pill typography discipline: metadata file disajikan bersih dengan separator tipografis (`·`).
  - Pemutar audio sampel yang rapi dengan scrub bar dan visualizer gelombang.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Decoding via Web Audio API + Server-side AI Analysis**
  - *Chosen Approach*: Decode audio file langsung di browser menggunakan `AudioContext.decodeAudioData` untuk verifikasi integritas file, penghitungan $F_0$ pitch lokal, dan visualizer tanpa lag jaringan. Hanya data audio base64 yang dikirimkan ke server untuk transkripsi `gemini-3.5-transcribe` dan profiling `gemini-3.8-flash`.
  - *Why*: Sangat cepat, efisien, dan memberikan feedback instan kepada pengguna jika file rusak atau tidak didukung sebelum upload server.
- **Decision 2: Seamless Tab Switch ke Studio TTS**
  - *Chosen Approach*: Tombol aksi di kartu profil vokal akan langsung memindahkan pengguna ke tab **Text-to-Speech** dengan parameter slider (Pitch, Formant, Persona) yang sudah terisi otomatis.
  - *Why*: Memudahkan alur kerja pengguna dari upload audio hingga mendengar hasil teks disuarakan dalam 1 klik.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Browser Client                       │
│                                                        │
│  ┌──────────────────────────┐  ┌────────────────────┐  │
│  │   Audio Upload Dropzone  │  │   Voice Recorder   │  │
│  │   (MP3, WAV, M4A Drag)   │  │   (Live Mic F0)    │  │
│  └─────────────┬────────────┘  └─────────┬──────────┘  │
│                │                         │             │
│                ▼                         ▼             │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Web Audio API (Local PCM Decoder)        │  │
│  │    Extract: RMS, Pitch F0 (Hz), Sample Rate      │  │
│  └──────────────────────────┬───────────────────────┘  │
└─────────────────────────────┼──────────────────────────┘
                              │ POST /api/transcribe & analyze
                              ▼
┌────────────────────────────────────────────────────────┐
│                 Express Server.ts                      │
│                                                        │
│  ┌──────────────────────────┐  ┌────────────────────┐  │
│  │  gemini-3.5-transcribe   │  │  gemini-3.8-flash  │  │
│  │  (Auto-Transcribe audio) │  │  (Voice Profiling) │  │
│  └──────────────────────────┘  └────────────────────┘  │
│                             │                          │
│                             ▼                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  gemini-3.8-flash-lite-tts / flash-tts           │  │
│  │  (Personalized Voice Synthesis to 24kHz WAV)     │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

- **Komponen yang Ditingkatkan**:
  - `src/components/VoiceRecorder.tsx`: Menambahkan mode toggle "Rekam Langsung" vs "Upload File Suara", area Drag-and-Drop dengan preview metadata file yang kaya, tombol sampel audio bawaan, dan tombol analisis otomatis.
  - `src/components/VoiceProfileCard.tsx`: Menyediakan status asal sampel (apakah dari rekaman langsung atau file yang diupload).
  - `src/components/TtsStudio.tsx`: Menjaga sinkronisasi profil yang diupload untuk penyesuaian instan nada dan kecepatan.
