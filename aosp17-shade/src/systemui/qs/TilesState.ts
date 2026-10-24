/**
 * qs/TilesState.ts — 移植自
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/qs/tileimpl/QSTileImpl.java（状态机）
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/qs/panels/data/repository/StockTilesRepository.kt（默认磁贴）
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/qs/panels/ui/viewmodel/TileUiState.kt
 *
 * STATE_ACTIVE / STATE_INACTIVE / STATE_UNAVAILABLE （android.service.quicksettings.Tile）
 */
import { ICONS } from '../../res/drawable/icons';

export const STATE_ACTIVE = 1;
export const STATE_INACTIVE = 2;
export const STATE_UNAVAILABLE = 0;

export interface TileState {
  state: number;
  label: string;
  secondaryLabel?: string;
  /** 双目标磁贴：主目标切换，副目标打开详情（如 Internet/Wi-Fi） */
  handlesToggleClick: boolean;
  iconOn?: string;
  iconOff?: string;
}

export interface TileSpecDef {
  spec: string;
  icon: string; // ICONS key
  label: string;
  /** 默认状态 */
  initial: number;
  secondaryLabelOn?: string;
  secondaryLabelOff?: string;
  /** 双目标（2x1）: 点击左侧切换 / 右侧打开菜单 */
  dualTarget?: boolean;
  /** 点击副作用 */
  onToggle?: (tiles: TilesState, spec: string, active: boolean) => void;
}

/** StockTilesRepository 默认磁贴顺序（Android 17：Wi-Fi 与移动数据拆分为双目标磁贴） */
export const DEFAULT_TILES: TileSpecDef[] = [
  {
    spec: 'internet', icon: 'vd_wifi', label: '互联网', initial: STATE_ACTIVE,
    secondaryLabelOn: 'WLAN 已连接', secondaryLabelOff: '未连接', dualTarget: true,
  },
  {
    spec: 'bluetooth', icon: 'ic_bluetooth_connected', label: '蓝牙', initial: STATE_INACTIVE,
    secondaryLabelOn: '已连接', secondaryLabelOff: '已关闭',
  },
  {
    spec: 'dnd', icon: 'vd_dnd', label: '勿扰', initial: STATE_INACTIVE,
    secondaryLabelOn: '已开启', secondaryLabelOff: '已关闭',
    onToggle: (t, s, a) => t.emit('dnd', a),
  },
  {
    spec: 'flashlight', icon: 'vd_flashlight', label: '手电筒', initial: STATE_INACTIVE,
    secondaryLabelOn: '已开启', secondaryLabelOff: '已关闭',
  },
  {
    spec: 'rotation', icon: 'qs_auto_rotate_icon_off', label: '自动旋转', initial: STATE_ACTIVE,
    secondaryLabelOn: '已锁定竖屏', secondaryLabelOff: '自动旋转',
  },
  {
    spec: 'battery', icon: 'vd_battery_saver', label: '省电模式', initial: STATE_INACTIVE,
    secondaryLabelOn: '已开启', secondaryLabelOff: '已关闭',
  },
  {
    spec: 'airplane', icon: 'vd_airplane', label: '飞行模式', initial: STATE_INACTIVE,
    secondaryLabelOn: '已开启', secondaryLabelOff: '已关闭',
  },
  {
    spec: 'darkmode', icon: 'vd_night_light', label: '深色主题', initial: STATE_INACTIVE,
    secondaryLabelOn: '已开启', secondaryLabelOff: '已关闭',
    onToggle: (t, _s, a) => t.emit('darkmode', a),
  },
  {
    spec: 'cast', icon: 'ic_cast', label: '投屏', initial: STATE_INACTIVE,
    secondaryLabelOff: '无可用设备',
  },
  {
    spec: 'screenrecord', icon: 'vd_screenrecord', label: '屏幕录制', initial: STATE_INACTIVE,
    secondaryLabelOn: '正在录制', secondaryLabelOff: '已关闭',
  },
  {
    spec: 'hotspot', icon: 'qs_hotspot_icon_off', label: '热点', initial: STATE_INACTIVE,
    secondaryLabelOn: '已开启', secondaryLabelOff: '已关闭',
  },
  {
    spec: 'satellite', icon: 'ic_satellite_not_connected', label: '卫星', initial: STATE_UNAVAILABLE,
    secondaryLabelOff: '无卫星服务',
  },
];

export type TileEvent = 'dnd' | 'darkmode';

/** QSTileImpl 简化版状态机：collect 状态 → toUiState */
export class TilesState {
  private states = new Map<string, TileState>();
  private listeners = new Set<() => void>();
  events = new Set<(ev: TileEvent, active: boolean) => void>();

  constructor() {
    for (const d of DEFAULT_TILES) {
      this.states.set(d.spec, {
        state: d.initial,
        label: d.label,
        secondaryLabel: d.initial === STATE_ACTIVE ? d.secondaryLabelOn : d.secondaryLabelOff,
        handlesToggleClick: !!d.dualTarget,
        iconOn: d.icon,
        iconOff: d.icon,
      });
    }
  }

  get(spec: string): TileState {
    return this.states.get(spec)!;
  }

  toggle(spec: string) {
    const st = this.states.get(spec);
    if (!st || st.state === STATE_UNAVAILABLE) return;
    const active = st.state !== STATE_ACTIVE;
    st.state = active ? STATE_ACTIVE : STATE_INACTIVE;
    const def = DEFAULT_TILES.find((d) => d.spec === spec)!;
    st.secondaryLabel = active ? def.secondaryLabelOn : def.secondaryLabelOff;
    def.onToggle?.(this, spec, active);
    this.notify();
  }

  setUnavailable(spec: string, unavailable: boolean) {
    const st = this.states.get(spec);
    if (!st) return;
    if (unavailable && st.state !== STATE_UNAVAILABLE) {
      st.state = STATE_UNAVAILABLE;
      this.notify();
    } else if (!unavailable && st.state === STATE_UNAVAILABLE) {
      st.state = STATE_INACTIVE;
      this.notify();
    }
  }

  emit(ev: TileEvent, active: boolean) {
    this.events.forEach((f) => f(ev, active));
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((f) => f());
  }

  iconFor(spec: string): string {
    return DEFAULT_TILES.find((d) => d.spec === spec)!.icon;
  }
}

/** IconTilesViewModel.isIconTile — QQS/紧凑态使用图标磁贴的规格 */
const ICON_ONLY_SPECS = new Set(['internet', 'bluetooth', 'dnd', 'flashlight']);
export function isIconTile(spec: string): boolean {
  return ICON_ONLY_SPECS.has(spec);
}
