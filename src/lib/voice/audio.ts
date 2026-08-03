/**
 * Utilitários de áudio compartilhados pela captura de voz da Marina
 * (gravação por botão e modo conversa contínua).
 */

export const TARGET_SAMPLE_RATE = 16000;

/** Junta os blocos PCM e reamostra (linear) para a taxa alvo. */
export function resamplePcm(
  chunks: Float32Array[],
  fromRate: number,
  toRate: number,
): Float32Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  if (fromRate === toRate) return merged;
  const ratio = fromRate / toRate;
  const outLength = Math.floor(merged.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = merged[idx] ?? 0;
    const b = merged[idx + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/** Escreve um WAV 16-bit mono completo (com header) — decodificável em qualquer browser. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Energia RMS do quadro (0..1), usada pela detecção de fala. */
export function frameRms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / Math.max(1, frame.length));
}

/**
 * Extrai as frases já completas de um texto que ainda está sendo transmitido.
 * Devolve as frases fechadas e o resto que ainda não terminou.
 */
export function takeCompleteSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let rest = buffer;
  const pattern = /[^.!?…\n]*[.!?…\n]+/;
  while (true) {
    const match = rest.match(pattern);
    if (!match || match.index === undefined) break;
    const piece = rest.slice(0, match.index + match[0].length);
    rest = rest.slice(match.index + match[0].length);
    const clean = piece.trim();
    // Junta frases muito curtas ("Ok.") com a próxima para não picar o áudio.
    if (clean.length < 12 && sentences.length > 0) {
      sentences[sentences.length - 1] = `${sentences[sentences.length - 1]} ${clean}`.trim();
    } else if (clean) {
      sentences.push(clean);
    }
  }
  return { sentences, rest };
}

/** Limpa markdown e símbolos que soam mal quando lidos em voz alta. */
export function textForSpeech(text: string): string {
  return (text ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/[👉🔔📎✅⚠️]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
