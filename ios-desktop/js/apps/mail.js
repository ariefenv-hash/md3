// ==================== mail.js — 邮件 (Material Design 3) ====================

import { ICONS } from '../icons.js';

export default {
  id: 'mail',
  name: '邮件',
  pages: [
    {
      title: '收件箱',
      content: `
        <div style="padding:16px 0;position:relative;min-height:100%;">
          <!-- 搜索栏 MD3 Search Bar -->
          <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-container-high);padding:10px 16px;border-radius:var(--md-r-full);margin-bottom:16px;border:1px solid var(--md-outline-variant);">
            <span style="font-size:18px;color:var(--md-on-surface-variant);">${ICONS.search}</span>
            <input type="text" placeholder="搜索邮件..." style="background:transparent;border:none;outline:none;color:var(--md-on-surface);font-size:14px;width:100%;">
          </div>

          <!-- 邮件列表 MD3 Cards -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div class="md3-card" style="cursor:pointer;padding:14px 16px;" onclick="pushSubPage(1)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:8px;height:8px;border-radius:50%;background:var(--md-primary);"></div>
                  <span style="font-size:15px;font-weight:600;color:var(--md-on-surface);">GitHub</span>
                </div>
                <span style="font-size:12px;color:var(--md-on-surface-variant);">09:24</span>
              </div>
              <div style="font-size:13px;font-weight:500;color:var(--md-primary);margin-bottom:2px;">[PR] Fix spring animation overflow bug — 已合并</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">你的 Pull Request #142 已被批准并合并到 main 分支...</div>
            </div>

            <div class="md3-card" style="cursor:pointer;padding:14px 16px;" onclick="pushSubPage(2)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:8px;height:8px;border-radius:50%;background:transparent;"></div>
                  <span style="font-size:15px;font-weight:600;color:var(--md-on-surface);">Apple / Google Security</span>
                </div>
                <span style="font-size:12px;color:var(--md-on-surface-variant);">昨天</span>
              </div>
              <div style="font-size:13px;font-weight:500;color:var(--md-on-surface);margin-bottom:2px;">您的账号在新设备上登录</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">您的账号于 2026-08-12 14:20 在 MacBook Pro (M3) 上成功登录...</div>
            </div>

            <div class="md3-card" style="cursor:pointer;padding:14px 16px;" onclick="pushSubPage(3)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:8px;height:8px;border-radius:50%;background:transparent;"></div>
                  <span style="font-size:15px;font-weight:600;color:var(--md-on-surface);">团队周报</span>
                </div>
                <span style="font-size:12px;color:var(--md-on-surface-variant);">周一</span>
              </div>
              <div style="font-size:13px;font-weight:500;color:var(--md-on-surface);margin-bottom:2px;">第 32 周工作总结与下周计划</div>
              <div style="font-size:12px;color:var(--md-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">1. 桌面模拟器动画引擎重构完成；2. MD3 表达性滑块上线...</div>
            </div>
          </div>

          <!-- 浮动写邮件按钮 MD3 FAB -->
          <div style="position:fixed;bottom:24px;right:24px;z-index:10;">
            <button class="md3-fab" onclick="pushSubPage(4)">
              <span style="font-size:24px;">${ICONS.edit}</span>
            </button>
          </div>
        </div>
      `,
    },
    {
      title: '邮件详情',
      content: `
        <div style="padding:16px 0;">
          <div class="md3-card" style="margin-bottom:16px;">
            <h2 style="font-size:18px;font-weight:600;line-height:1.4;color:var(--md-on-surface);margin-bottom:10px;">[PR] Fix spring animation overflow bug — approved</h2>
            <div style="display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid var(--md-outline-variant);">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--md-secondary-container);display:flex;align-items:center;justify-content:center;font-size:18px;">${ICONS.code}</div>
              <div style="flex:1;">
                <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);">GitHub</div>
                <div style="font-size:12px;color:var(--md-on-surface-variant);">noreply@github.com · 09:24</div>
              </div>
            </div>
            <div style="padding-top:16px;font-size:14px;line-height:1.6;color:var(--md-on-surface);">
              <p>Hi,</p>
              <p style="margin:10px 0;">你的 Pull Request <strong>#142</strong> 已被批准并合并到 <code style="background:var(--md-surface-container-highest);padding:2px 8px;border-radius:6px;font-size:13px;color:var(--md-primary);">main</code> 分支。</p>
              <p style="margin:10px 0;">修改内容：重构物理弹簧引擎，优化文件夹打开/返回动画连续性，全面适配 Material Design 3 表达性设计系统与定制圆角间隙滑块。</p>
              <p style="margin-top:16px;">感谢你的卓越贡献！${ICONS.auto_awesome}</p>
              <p style="color:var(--md-on-surface-variant);font-size:12px;margin-top:20px;">— GitHub Notifications</p>
            </div>
          </div>
        </div>
      `,
    },
    {
      title: 'Apple ID 通知',
      content: `
        <div style="padding:16px 0;">
          <div class="md3-card">
            <h2 style="font-size:18px;font-weight:600;line-height:1.4;color:var(--md-on-surface);margin-bottom:12px;">您的账号在新设备上登录</h2>
            <div style="font-size:12px;color:var(--md-on-surface-variant);margin-bottom:16px;">Apple &lt;no_reply@email.apple.com&gt; · 昨天 14:30</div>
            <p style="font-size:14px;line-height:1.6;color:var(--md-on-surface);">尊敬的用户，您的账号已于以下时间在一台新设备上登录：</p>
            <div style="background:var(--md-surface-container-high);border-radius:var(--md-r-md);padding:14px;margin:14px 0;font-size:13px;line-height:1.8;">
              <div><strong>日期：</strong>2026 年 8 月 12 日 14:20</div>
              <div><strong>设备：</strong>MacBook Pro (M3 Max)</div>
              <div><strong>位置：</strong>中国上海 (IP: 218.80.xxx.xxx)</div>
            </div>
            <button class="md3-btn md3-btn-filled" style="width:100%;margin-top:12px;" onclick="__demoAction && __demoAction('管理受信任设备')">管理受信任设备</button>
          </div>
        </div>
      `,
    },
    {
      title: '团队周报',
      content: `
        <div style="padding:16px 0;">
          <div class="md3-card">
            <h2 style="font-size:18px;font-weight:600;color:var(--md-on-surface);margin-bottom:8px;">第 32 周工作总结与下周计划</h2>
            <div style="font-size:12px;color:var(--md-on-surface-variant);margin-bottom:16px;">团队周报 &lt;team@company.com&gt; · 周一 10:00</div>
            <div style="font-size:14px;line-height:1.6;color:var(--md-on-surface);">
              <div style="font-weight:600;color:var(--md-primary);margin-bottom:6px;">本周核心成果：</div>
              <p>1. 桌面模拟器动画引擎重构，实现几何无畸变弹簧回归<br>2. 图标长按拖拽重构，提升 120fps 渲染流畅度<br>3. 文件夹内打开应用保留展开状态并在关闭时准确归位<br>4. Material Design 3 表达性滑块深度适配</p>
            </div>
          </div>
        </div>
      `,
    },
    {
      title: '写新邮件',
      content: `
        <div style="padding:16px 0;">
          <div class="md3-card" style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <span style="font-size:12px;color:var(--md-on-surface-variant);">收件人</span>
              <input type="text" placeholder="example@domain.com" style="width:100%;background:transparent;border:none;border-bottom:1px solid var(--md-outline-variant);padding:6px 0;color:var(--md-on-surface);outline:none;font-size:14px;">
            </div>
            <div>
              <span style="font-size:12px;color:var(--md-on-surface-variant);">主题</span>
              <input type="text" placeholder="邮件主题" style="width:100%;background:transparent;border:none;border-bottom:1px solid var(--md-outline-variant);padding:6px 0;color:var(--md-on-surface);outline:none;font-size:14px;">
            </div>
            <div>
              <span style="font-size:12px;color:var(--md-on-surface-variant);">正文</span>
              <textarea placeholder="在这里撰写邮件内容..." style="width:100%;min-height:160px;background:transparent;border:none;padding:8px 0;color:var(--md-on-surface);outline:none;font-size:14px;resize:none;line-height:1.6;"></textarea>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:16px;">
            <button class="md3-btn md3-btn-filled" style="flex:1;" onclick="alert('邮件已发送！');if (window.popSubPage) window.popSubPage();">发送邮件</button>
            <button class="md3-btn md3-btn-tonal" style="flex:1;" onclick="__demoAction && __demoAction('存为草稿')">存为草稿</button>
          </div>
        </div>
      `,
    },
  ],
};
