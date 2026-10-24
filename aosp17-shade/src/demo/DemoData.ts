/**
 * demo/DemoData.ts — 样例通知（覆盖 notification_2025 各模板形态）
 *  - conversation/messaging（会话 + face pile）
 *  - big text
 *  - progress
 *  - media
 *  - 普通通知 × 2
 */
import { NotifModel } from '../systemui/notifications/RowTemplates';

export function sampleNotifications(): NotifModel[] {
  return [
    {
      key: '1',
      app: 'com.google.android.apps.messaging',
      appName: '信息',
      title: '林小满',
      text: '今晚要不要一起去看电影？新开的 IMAX 好像还不错',
      time: '10:24',
      smallIconText: '信',
      smallIconBg: '#5B8DEF',
      facePile: ['林小满', '陈子昂'],
      messages: [
        { sender: '林小满', text: '今晚要不要一起去看电影？新开的 IMAX 好像还不错', time: '10:24' },
        { sender: '陈子昂', text: '可以啊，几点场次的？', time: '10:26' },
        { sender: '林小满', text: '我看看… 19:40 和 21:10 两场，选哪个？', time: '10:28' },
      ],
      expandedText: '今晚要不要一起去看电影？新开的 IMAX 好像还不错',
      actions: [{ title: '标记为已读' }, { title: '回复' }],
    },
    {
      key: '2',
      app: 'com.android.systemui.demo',
      appName: '系统更新',
      title: 'Android 17 安全补丁',
      text: '已下载 78% · 等待 Wi-Fi 完成剩余部分',
      time: '09:57',
      smallIconText: '⬇',
      smallIconBg: '#34A853',
      progress: 0.78,
      expandedText: '已下载 78% · 等待 Wi-Fi 完成剩余部分。此次更新包含 2026 年 10 月安全补丁。',
      actions: [{ title: '暂停' }, { title: '查看详情' }],
    },
    {
      key: '3',
      app: 'com.google.android.youtube',
      appName: 'YouTube',
      title: '正在播放',
      text: 'Nightcall · Kavinsky',
      time: '现在',
      smallIconText: '▶',
      smallIconBg: '#D93025',
      media: { title: 'Nightcall', artist: 'Kavinsky — Outrun', gradient: 'linear-gradient(135deg,#3D2E56,#7A4E8F)' },
    },
    {
      key: '4',
      app: 'com.google.android.gm',
      appName: 'Gmail',
      title: 'Design Review 周四 14:00',
      text: '提醒：SystemUI Shade 移植评审会将在周四下午两点进行，请提前阅读文档…',
      time: '08:31',
      smallIconText: 'M',
      smallIconBg: '#EA4335',
      rightIconText: 'D',
      rightIconBg: '#1A73E8',
      expandedText:
        '提醒：SystemUI Shade 移植评审会将在周四下午两点进行，请提前阅读文档并准备两个问题。会议室已订好，也支持线上接入。',
      actions: [{ title: '查看邮件' }, { title: '稍后提醒' }],
    },
    {
      key: '5',
      app: 'com.spotify.music',
      appName: 'Spotify',
      title: '每日推荐已就绪',
      text: '根据你最近的收听习惯，为你准备了新的 30 首歌单',
      time: '昨天',
      smallIconText: '♪',
      smallIconBg: '#1DB954',
      rightIconText: '♫',
      rightIconBg: '#1DB954',
      expandedText: '根据你最近的收听习惯，为你准备了新的 30 首歌单。打开应用即可开始收听今天的推荐。',
    },
    {
      key: '6',
      app: 'com.android.chrome',
      appName: 'Chrome',
      title: '后台标签页已更新',
      text: '3 个标签页的内容已刷新完毕',
      time: '昨天',
      smallIconText: '◉',
      smallIconBg: '#FBBC05',
      expandedText: '3 个标签页的内容已刷新完毕。',
    },
  ];
}
