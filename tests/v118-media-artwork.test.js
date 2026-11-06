// ==================== v118-media-artwork.test.js — #118 MediaSession artwork 封面 v10.09 ====================
//
// 覆盖（R84 窗加餐）：
//   · media-meta.js 纯逻辑真跑：测试内构造最小 ID3v2.3 + APIC（front cover）帧 →
//     parseAudioMeta 真解析出 cover {mime,data}；artworkFromTrack 映射（src/sizes/type）
//     + 无封面空数组（MediaMetadata artwork 空数组语义）
//   · mediaService.importLocalAudio：内嵌封面解析 → coverUrl/coverMime 落 track +
//     objectURL 同桶登记（淘汰同 revoke 锚）
//   · external 封面通道：MEDIA_STATE_SYNC payload.coverUrl/coverMime 直通 + 清除回落
//   · syncMediaSession artwork 接线锚：artworkFromTrack(ex || track)——外部覆盖层优先
//     （它才是当前受控会话的曲面，#110 仲裁同口径）
//   · 通知胶囊真封面渲染锚：.noti-media-cover-img 建立/同源去重/回落字形 + CSS
//     16px 圆角 object-fit + 零裸色
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAudioMeta, artworkFromTrack } from '../ios-desktop/js/media-meta.js';
import { mediaService } from '../ios-desktop/js/media-service.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const MS = readFileSync(R('js/media-service.js'), 'utf8');
const MM = readFileSync(R('js/media-meta.js'), 'utf8');
const NT = readFileSync(R('js/notifications.js'), 'utf8');
const CSS = readFileSync(R('css/pull-panels.css'), 'utf8');

/** 最小 ID3v2.3 + APIC front-cover 帧（真字节构造，非 mock） */
function buildMp3WithApic(jpegBytes) {
  const enc = new TextEncoder();
  const mime = enc.encode('image/jpeg');
  const body = new Uint8Array(1 + mime.length + 1 + 1 + 1 + jpegBytes.length);
  let o = 0;
  body[o++] = 0; // encoding ISO-8859-1
  body.set(mime, o); o += mime.length;
  body[o++] = 0; // mime NUL
  body[o++] = 3; // picture type = front cover
  body[o++] = 0; // description NUL
  body.set(jpegBytes, o);
  const frame = new Uint8Array(10 + body.length);
  frame.set(enc.encode('APIC'), 0);
  frame[4] = (body.length >>> 24) & 0xff; frame[5] = (body.length >>> 16) & 0xff;
  frame[6] = (body.length >>> 8) & 0xff; frame[7] = body.length & 0xff;
  frame.set(body, 10);
  const tag = new Uint8Array(10 + frame.length);
  tag.set(enc.encode('ID3'), 0);
  tag[3] = 3; tag[4] = 0; tag[5] = 0; // v2.3, no flags
  tag[6] = (frame.length >>> 21) & 0x7f; tag[7] = (frame.length >>> 14) & 0x7f;
  tag[8] = (frame.length >>> 7) & 0x7f; tag[9] = frame.length & 0x7f;
  tag.set(frame, 10);
  return tag;
}

afterEach(() => {
  mediaService.external = null;
  mediaService.audio = null;
  mediaService.isPlaying = false;
  // 清掉测试注入的本地曲目，防跨用例泄漏（importLocalAudio 直改 playlist）
  mediaService.playlist = mediaService.playlist.filter((t) => !t.isLocal);
});

describe('#118 media-meta 封面解析与 artwork 映射', () => {
  it('最小 ID3v2.3+APIC 真解析：cover {mime,data}（front cover 优先）', () => {
    const jpeg = Array.from({ length: 40 }, (_, i) => (i === 0 ? 0xff : i === 1 ? 0xd8 : i % 256)); // >32 门（解析器截断防御）
    const meta = parseAudioMeta(buildMp3WithApic(jpeg));
    expect(meta.cover).toBeTruthy();
    expect(meta.cover.mime).toBe('image/jpeg');
    expect(Array.from(meta.cover.data)).toEqual(jpeg);
  });

  it('无封面/非音频字节 → 无 cover（防御面）', () => {
    expect(parseAudioMeta(new TextEncoder().encode('not-an-audio-file-padding!!')).cover).toBeUndefined();
    expect(parseAudioMeta(null).cover).toBeUndefined();
  });

  it('artworkFromTrack：src/sizes/type 全映射 + 默认 mime + 无封面空数组', () => {
    expect(artworkFromTrack({ coverUrl: 'blob:x', coverMime: 'image/png' }))
      .toEqual([{ src: 'blob:x', sizes: '512x512', type: 'image/png' }]);
    expect(artworkFromTrack({ coverUrl: 'blob:x' })[0].type).toBe('image/jpeg');
    expect(artworkFromTrack({})).toEqual([]);
    expect(artworkFromTrack(null)).toEqual([]);
  });
});

describe('#118 mediaService 本地导入封面链', () => {
  it('importLocalAudio：APIC → coverUrl/coverMime 落 track + objectURL 同桶登记', async () => {
    const origCO = URL.createObjectURL, origRO = URL.revokeObjectURL;
    let created = 0;
    URL.createObjectURL = () => `blob:mock-${++created}`;
    URL.revokeObjectURL = () => {};
    try {
      const fakeAudio = { paused: true, src: '', currentTime: 0, duration: 0, volume: 1, playbackRate: 1, preload: '',
        play: vi.fn(async () => {}), pause: vi.fn(), addEventListener() {}, removeEventListener() {} };
      mediaService.audio = fakeAudio; // 免 node 无 Audio
      const bytes = buildMp3WithApic(Array.from({ length: 40 }, (_, i) => (i === 0 ? 0xff : i === 1 ? 0xd8 : i % 256)));
      const file = { name: 'demo.mp3', size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(0) };
      mediaService.importLocalAudio(file);
      await new Promise((r) => setTimeout(r, 25)); // 异步解析窗
      const t0 = mediaService.playlist.find((t) => t.isLocal);
      expect(t0).toBeTruthy();
      expect(t0.coverUrl).toMatch(/^blob:mock-/);
      expect(t0.coverMime).toBe('image/jpeg');
      expect(mediaService.localUrls.has(t0.id + '-cover')).toBe(true); // 同桶登记（淘汰同 revoke）
      expect(artworkFromTrack(t0)[0].src).toBe(t0.coverUrl);
      // 解析失败零影响面：无封面文件不落 coverUrl
      mediaService.playlist = mediaService.playlist.filter((t) => !t.isLocal);
      const plain = new Uint8Array(64); // 非音频
      mediaService.importLocalAudio({ name: 'plain.mp3', size: 64, arrayBuffer: async () => plain.buffer });
      await new Promise((r) => setTimeout(r, 25));
      const t1 = mediaService.playlist.find((t) => t.isLocal);
      expect(t1.coverUrl).toBeUndefined();
      expect(mediaService.localUrls.has(t1.id + '-cover')).toBe(false);
    } finally {
      URL.createObjectURL = origCO; URL.revokeObjectURL = origRO;
    }
  });

  it('淘汰路径封面同撤销锚（-cover 同桶 + revokeObjectURL 调用面）', () => {
    expect(MS).toContain("this.localUrls.set(newTrack.id + '-cover', coverUrl)");
    expect(MS).toMatch(/if \(t\.coverUrl\) URL\.revokeObjectURL\(t\.coverUrl\)/);
    expect(MS).toContain("this.localUrls.delete(t.id + '-cover')");
  });
});

describe('#118 external 封面通道', () => {
  it('MEDIA_STATE_SYNC payload.coverUrl/coverMime 直通 getState().track', () => {
    mediaService.applyExternalState({ title: '外部曲', artist: 'A', isPlaying: true, currentTime: 1, duration: 10, coverUrl: 'data:image/png;base64,AAA', coverMime: 'image/png' });
    const t = mediaService.getState().track;
    expect(t.coverUrl).toBe('data:image/png;base64,AAA');
    expect(t.coverMime).toBe('image/png');
    expect(artworkFromTrack(t)[0].type).toBe('image/png');
  });

  it('无 coverUrl 字段 = 维持既有回落（字段缺省不清空）', () => {
    mediaService.applyExternalState({ title: '曲一', isPlaying: true, coverUrl: 'blob:keep' });
    mediaService.applyExternalState({ title: '曲一', isPlaying: true, currentTime: 2 }); // 进度上报不带封面
    expect(mediaService.getState().track.coverUrl).toBe('blob:keep');
    mediaService.applyExternalState({ title: '', isPlaying: false }); // 清场
    expect(mediaService.externalActive()).toBe(false);
  });

  it('syncMediaSession artwork 接线锚：外部覆盖层优先（受控会话曲面，#110 同口径）', () => {
    expect(MS).toContain('artwork: artworkFromTrack(ex || track)');
    expect(MS).toContain("import { parseAudioMeta, artworkFromTrack } from './media-meta.js';");
    expect(MM).toContain('export function artworkFromTrack(track)');
  });
});

describe('#118 通知胶囊真封面渲染锚', () => {
  it('coverEl img 建立 + 同源去重 + 无封面回落字形', () => {
    expect(NT).toContain("img.className = 'noti-media-cover-img'");
    expect(NT).toMatch(/if \(coverUrl\) \{\s*\n\s*if \(!coverEl\.querySelector\('img'\) \|\| coverEl\.querySelector\('img'\)\.src !== coverUrl\)/);
    expect(NT).toMatch(/else if \(coverEl\.querySelector\('img'\)\) \{\s*\n\s*coverEl\.innerHTML = ICONS\.song_search \|\| ICONS\.media_play;/);
  });

  it('CSS：16px 圆角 object-fit 满贴 + 新块零裸色', () => {
    expect(CSS).toContain('.noti-media-cover .noti-media-cover-img {');
    expect(CSS).toMatch(/\.noti-media-cover \.noti-media-cover-img \{[^}]*border-radius: 16px;[^}]*object-fit: cover;[^}]*\}/s);
    const block = CSS.split('.noti-media-cover .noti-media-cover-img {')[1].split('}')[0];
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/); // 零裸色纪律
  });
});
