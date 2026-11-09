import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY tidak ditemukan di file .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

/**
 * Profil Persona Vokal Bar (diekstraksi dari "Jalan Raya Mas No. 80 4.m4a")
 * - Gender: Pria
 * - Register: Baritone / Conversational Tenor
 * - Pacing: Santai, informatif, artikulasi lugas, ramah
 */
export const BAR_VOICE_PROFILE = {
  voiceName: 'Puck', // Base voice prebuilt Google yang paling cocok untuk gaya santai anak tech
  style:
    'Santai, ramah, intonasi percakapan bahasa Indonesia alami, artikulasi lugas seorang tech backend developer',
  modelType: 'gemini-3.8-flash-lite-tts',
};

async function main() {
  const args = process.argv.slice(2);
  let text = '';
  let outputFile = 'output.wav';
  let voiceName = BAR_VOICE_PROFILE.voiceName;
  let style = BAR_VOICE_PROFILE.style;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' || args[i] === '-f') {
      const filePath = args[++i];
      if (filePath && fs.existsSync(filePath)) {
        text = fs.readFileSync(filePath, 'utf-8');
      } else {
        console.error(`File naskah tidak ditemukan: ${filePath}`);
        process.exit(1);
      }
    } else if (args[i] === '--out' || args[i] === '-o') {
      outputFile = args[++i] || outputFile;
    } else if (args[i] === '--voice' || args[i] === '-v') {
      voiceName = args[++i] || voiceName;
    } else if (args[i] === '--style' || args[i] === '-s') {
      style = args[++i] || style;
    } else if (!text && !args[i].startsWith('-')) {
      text = args[i];
    }
  }

  if (!text.trim()) {
    console.log(`
===========================================================
  SuaraKu AI - CLI Text-to-Speech (Persona Suara Bar)
===========================================================
Penggunaan:
  npm run speak "<teks naskah Anda>"
  npm run speak -- --file naskah.txt --out audio-narasi.wav

Opsi:
  --file, -f   Path ke file teks naskah (.txt)
  --out, -o    Nama file output .wav (default: output.wav)
  --voice, -v  Model suara dasar: Puck (default), Fenrir, Charon, Kore, Zephyr
  --style, -s  Kustomisasi prompt gaya bicara / intonasi
`);
    process.exit(0);
  }

  console.log(`\n🎙️  Menghasilkan ucapan dengan profil persona vokal Bar...`);
  console.log(`- Naskah: "${text.trim().slice(0, 90)}${text.trim().length > 90 ? '...' : ''}"`);
  console.log(`- Voice Preset : ${voiceName}`);
  console.log(`- Style Persona: ${style}`);

  const response = await ai.models.generateContent({
    model: BAR_VOICE_PROFILE.modelType,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: text.trim(),
            speechMetadata: {
              style: style,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64Audio) {
    throw new Error('Gagal: Model tidak menghasilkan data audio.');
  }

  const audioBuffer = Buffer.from(base64Audio, 'base64');
  fs.writeFileSync(outputFile, audioBuffer);
  console.log(
    `\n✅ Berhasil! Audio WAV 24kHz tersimpan di:\n   👉 ${path.resolve(outputFile)} (${(audioBuffer.length / 1024).toFixed(1)} KB)`
  );
}

main().catch((err) => {
  console.error('\n❌ Terjadi kesalahan:', err.message || err);
  process.exit(1);
});

