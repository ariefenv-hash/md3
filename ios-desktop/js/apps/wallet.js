// ==================== wallet.js — 钱包 (Material Design 3) ====================

import { ICONS } from '../icons.js';

export default {
  id: 'wallet',
  name: '钱包',
  pages: [
    {
      title: '钱包',
      content: `
        <div style="padding:16px 0;">
          <!-- MD3 卡片展示 (Google Wallet / MD3 Expressive Card) -->
          <div class="md3-card md3-card-elevated" style="aspect-ratio:1.6;max-width:320px;margin:10px auto 16px;border-radius:24px;background:linear-gradient(135deg,#1f2937,#111827);padding:22px;display:flex;flex-direction:column;justify-content:space-between;border:1px solid rgba(255,255,255,0.12);box-shadow:var(--md-shadow-3);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div style="color:#fff;font-size:16px;font-weight:600;letter-spacing:0.5px;">招商银行储蓄卡</div>
                <div style="color:var(--md-on-surface-variant);font-size:11px;margin-top:2px;">Google Pay 默认卡片</div>
              </div>
              <span style="font-size:24px;">${ICONS.credit_card}</span>
            </div>
            <div style="color:#fff;font-size:19px;letter-spacing:3px;font-family:monospace;font-weight:600;">•••• •••• •••• 8842</div>
            <div style="display:flex;justify-content:space-between;color:var(--md-on-surface-variant);font-size:12px;">
              <span>ZHANG SAN</span>
              <span>12/28</span>
            </div>
          </div>

          <div style="text-align:center;margin:12px 0 20px;color:var(--md-on-surface-variant);font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">
            <span style="color:var(--md-primary);">${ICONS.auto_awesome}</span>
            <span>靠近感应区即可完成支付</span>
          </div>

          <!-- 操作与记录 MD3 List -->
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item" onclick="pushSubPage(1)">
              <div class="md3-list-item-icon">${ICONS.assignment}</div>
              <div class="md3-list-item-text">近期交易记录明细</div>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">›</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.add_circle}</div>
              <div class="md3-list-item-text">添加银行卡或交通卡</div>
              <span style="color:var(--md-on-surface-variant);font-size:18px;">›</span>
            </div>
          </div>
        </div>
      `,
    },
    {
      title: '交易记录',
      content: `
        <div style="padding:16px 0;">
          <div style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 8px 10px;">今天</div>
          <div class="md3-card" style="padding:4px 0;margin-bottom:18px;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.coffee}</div>
              <div class="md3-list-item-text">
                <div>星巴克臻选</div>
                <div class="md3-list-item-subtext">09:12 · 静安区门店</div>
              </div>
              <span style="font-size:15px;font-weight:600;color:var(--md-error,#f2b8b5);">-¥38.00</span>
            </div>
            <div style="height:1px;background:var(--md-outline-variant);margin:0 16px;"></div>
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.metro}</div>
              <div class="md3-list-item-text">
                <div>上海交通卡自动充值</div>
                <div class="md3-list-item-subtext">08:30 · 乘车码</div>
              </div>
              <span style="font-size:15px;font-weight:600;color:var(--md-error,#f2b8b5);">-¥50.00</span>
            </div>
          </div>

          <div style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 8px 10px;">昨天</div>
          <div class="md3-card" style="padding:4px 0;overflow:hidden;">
            <div class="md3-list-item">
              <div class="md3-list-item-icon">${ICONS.paid}</div>
              <div class="md3-list-item-text">
                <div>工资薪酬发放</div>
                <div class="md3-list-item-subtext">18:00 · 招商银行汇入</div>
              </div>
              <span style="font-size:15px;font-weight:600;color:var(--md-success,#a8f5bb);">+¥15,800.00</span>
            </div>
          </div>
        </div>
      `,
    },
  ],
};
