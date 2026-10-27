// magenta-shim.mjs — @magenta/music/esm/core.js 的子集替身（esbuild alias 用）
// html-midi-player 实际只消费 6 个符号：Player / SoundFontPlayer /
// PianoRollSVGVisualizer / WaterfallSVGVisualizer / StaffSVGVisualizer / urlToNoteSequence。
// 官方 barrel (core/index.js) 还静态导出 data/aux_inputs/chords/melodies/audio_utils ——
// 这五个模块静态 import @tensorflow/tfjs（+1.5MB，浏览器场景零使用）。
// 本 shim 只从无 tfjs 依赖的子模块重导出，bundle 体积降一个数量级。
export { Player, SoundFontPlayer } from '@magenta/music/esm/core/player';
export { PianoRollSVGVisualizer, WaterfallSVGVisualizer, StaffSVGVisualizer } from '@magenta/music/esm/core/visualizer';
export { urlToNoteSequence } from '@magenta/music/esm/core/midi_io';
