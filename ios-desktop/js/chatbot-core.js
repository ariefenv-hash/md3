// ==================== chatbot-core.js — 聊天室 bot 本地化纯函数核（v8.56 #63） ====================
// #12 P2 末位：messages 应用升级——本地 bot 联系人拟人对话（替代在线聊天室的公共 socket 方案）。
// 议题执行要点逐条落地：
//   · bot 联系人 4 个（客服/朋友/极客/诗人，不同性格画像 + 问候/规则/追问/兜底全量回复池）；
//   · 本地规则引擎回复：关键词规则（主题命中→上下文记忆）+ 意图识别（问候/感谢/道别/提问/夸奖）
//     + 兜底反重复（连答 3 次兜底触发「自省」拟人彩蛋）；
//   · 连续快发消息不乱序：单槽调度（每 bot 至多一个 pending 回合，新消息合并计数并重定计划，
//     已派发回复不可变、追加单调）——乱序在结构上不可能发生；
//   · 拟人节奏：回复延迟 800ms~2.5s 随机（含长度因子，钳制在议题区间内），打字指示器先行；
//   · 已读回执：发送→已读两态（bot 开始「输入」即整批置已读）；
//   · 时间戳气泡组：5 分钟间隔分组 + 当日/昨天/同年/往年四级时间分隔标签；
//   · 零网络依赖零 API：全部回复本地规则池，无任何联网调用（fetch/长连接/HTTP 均无）。
// 本文件 = 纯函数核（vitest 锚），顶层零 DOM/网络副作用（radio/stt/driving-core 十二代同款 IIFE）；
// 页面侧 apps/messages/index.html 只做接线。
(function () {
  'use strict';

  // ---------- 常量 ----------
  /** 消息持久化上限（每 bot 会话） */
  var MSG_CAP = 200;
  /** 气泡分组间隔（5 分钟） */
  var GROUP_GAP_MS = 5 * 60 * 1000;
  /** 拟人回复延迟区间（议题锚：800ms~2.5s 随机） */
  var DELAY_MIN = 800;
  var DELAY_MAX = 2500;
  /** 兜底连击阈值（连续 fallback 次数≥3 → 自省回复） */
  var FALLBACK_STREAK_LIMIT = 3;

  /** 回执两态 */
  var RECEIPT = { SENT: 'sent', READ: 'read' };

  // ---------- 性格画像（4 bot：客服/朋友/极客/诗人） ----------
  /**
   * persona 结构：
   *   id/name/avatar/color/tag  身份与展示
   *   greeting                  首次开聊的主动问候
   *   rules[]                   关键词规则 { topic, keys[], replies[], followups[] }
   *   greetReplies/thanksReplies/byeReplies/praiseReplies/questionReplies  意图回复池
   *   fallbacks[]               兜底池（反重复）
   *   selfAware                 兜底连击自省回复（拟人彩蛋）
   *   genericFollowups[]        无主题追问的接续回复
   */
  var PERSONAS = [
    {
      id: 'b-kefu', name: '客服小夏', avatar: '客', color: '#1565C0',
      tag: '在线客服 · 有问必答',
      greeting: '您好呀，我是客服小夏～有什么可以帮您？',
      rules: [
        {
          topic: 'refund', keys: ['退款', '退货', '退换', '售后'],
          replies: [
            '退款我帮您看下流程：订单页 → 选商品 → 申请售后 → 原路退回，一般 1~3 个工作日到账哦。',
            '没问题！您在「我的订单」里点申请售后，选「仅退款」就行，到账了会短信提醒您。',
            '收到～退款走原路返回，银行卡 1~3 天、零钱秒到。需要我帮您备注加急吗？',
          ],
          followups: ['进度我可以帮您催一下，您把订单号发我就好。', '如果超时未到账，随时来找我，我给您升级处理。'],
        },
        {
          topic: 'shipping', keys: ['快递', '物流', '发货', '到货', '运单'],
          replies: [
            '您的包裹正在路上啦～物流信息在订单详情里可以实时看到哦。',
            '正常 48 小时内发货，偏远地区加 1~2 天。有延误您来找我，我帮您催单！',
            '查物流不用翻短信：订单页点开就有地图轨迹，比快递官方还快。',
          ],
          followups: ['单号发我，我帮您盯到签收为止。', '如果显示「运输异常」请马上告诉我，我来介入。'],
        },
        {
          topic: 'invoice', keys: ['发票', '开票', '抬头', '税号'],
          replies: ['电子发票在收货后 24h 内自动开出，抬头在「发票管理」里填就好，支持个人/企业。'],
          followups: ['抬头填错了也能重开，把正确税号发我就行。'],
        },
        {
          topic: 'account', keys: ['密码', '账号', '登录', '注册', '验证码'],
          replies: [
            '改密码：登录页 → 忘记密码 → 手机验证码重置，全程不超过一分钟。',
            '收不到验证码先看垃圾短信，还没有的话我帮您后台重发一次～',
          ],
          followups: ['还是不行的话，换个网络试试，一般是运营商通道抖动。'],
        },
        {
          topic: 'complaint', keys: ['投诉', '差评', '举报', '骗'],
          replies: [
            '真的非常抱歉给您添堵了！您的问题我逐字记下来了，2 小时内由主管回电给您。',
            '这事儿是我们的锅，我先给您道歉。您的诉求我已提交加急通道，处理结果短信同步您。',
          ],
          followups: ['您的投诉工单号我记好了，后续跟进不用重复说明。'],
        },
        {
          topic: 'human', keys: ['人工', '真人', '转人工', '客服呢'],
          replies: ['我就是人工客服小夏本夏呀～您说，我在听。', '您已经到人工啦，我就是真人！有什么问题直接说～'],
          followups: ['放心，全程都是我在为您服务，不会转来转去的。'],
        },
        {
          topic: 'hours', keys: ['几点', '营业', '工作时间', '下班'],
          replies: ['小夏全天在线（0 点到 24 点），半夜也在的，放心问～'],
          followups: ['夜里有急事也在，我值夜班。'],
        },
        {
          topic: 'price', keys: ['优惠', '便宜', '折扣', '价格', '贵'],
          replies: [
            '现在下单品有 95 折，叠加满减券再省 10 元，我在「领券中心」给您挂了个入口。',
            '价格方面我帮您申请了新人券，下单时会自动抵扣哦。',
          ],
          followups: ['大促前 1 天也有价保，买贵了差价自动退。'],
        },
        {
          topic: 'order', keys: ['订单', '下单', '购买', '买'],
          replies: ['下单后 30 分钟内可无理由取消，款项原路退回，不用理由不用申请。'],
          followups: ['订单号发我，我帮您查最新状态。'],
        },
      ],
      greetReplies: ['您好呀～我是客服小夏，很高兴为您服务！', '在的在的～您请讲。'],
      thanksReplies: ['不客气，这是小夏应该做的～祝您生活愉快！', '能帮到您就好，有问题随时回来找我哦。'],
      byeReplies: ['再见啦～给个五星好评就是对小夏最大的鼓励(*^▽^*)'],
      praiseReplies: ['谢谢夸奖～我会继续努力哒！'],
      questionReplies: ['您的问题我记下了，稍等，我帮您查一下内部知识库…', '好问题！我确认下细节，马上给您准确答复。'],
      fallbacks: [
        '嗯嗯，我在听，您详细说说～', '收到！您的问题小夏已经记下了，马上为您核实。',
        '明白您的意思了，我先给您初步方案，细节我再帮您跟进。', '这边帮您记好了～还有别的需要吗？',
        '我在呢，您慢慢说，不着急。',
      ],
      selfAware: '这个问题超出我的知识库啦，我给您转接到人工专家（工单已建，10 分钟内响应）。',
      genericFollowups: ['好的，我继续为您跟进～', '您放心，这件事我盯到底。'],
    },
    {
      id: 'b-friend', name: '阿乐', avatar: '乐', color: '#00695C',
      tag: '老朋友 · 无话不谈',
      greeting: '哟，来啦？今天过得咋样？',
      rules: [
        {
          topic: 'food', keys: ['吃', '饭', '外卖', '饿', '夜宵', '奶茶'],
          replies: [
            '又到了世界性难题：中午吃啥？我投火锅一票！', '饿了就别硬扛，点个你上周说想吃的=float快乐～',
            '奶茶我只认三分糖，多了腻少了苦，人类智慧的平衡点！',
          ],
          followups: ['选好了吗？选好记得跟我汇报，我帮你云监工。', '带上我一个，我请你都行！'],
        },
        {
          topic: 'game', keys: ['游戏', '开黑', '王者', '原神', 'steam', '吃鸡'],
          replies: [
            '来来来开黑！我最近手热得很，别看我段位低我意识强。', '昨晚又肝到两点，现在哈欠连天但值得！',
            '你说你菜？那是没跟我组过队，我carry不了但送得稳定哈哈哈。',
          ],
          followups: ['几点？我先去泡杯咖啡等着。', '今晚老时间？我先把设备充上电。'],
        },
        {
          topic: 'movie', keys: ['电影', '剧', '追剧', '番', '看啥'],
          replies: ['最近有部科幻片口碑炸了，看完记得来找我讨论剧情，我憋了好久的话！'],
          followups: ['看完别剧透给我，不对，先剧透一点，一点点！'],
        },
        {
          topic: 'weekend', keys: ['周末', '约', '出去玩', '爬山', '露营'],
          replies: ['周末必须安排！我查了天气不错，走起！', '我已经开始期待了，露营装备要不要我带？我有炉子！'],
          followups: ['定时间定地点，我订位！', '下雨就改剧本：我家沙发+电影+外卖，一样快乐。'],
        },
        {
          topic: 'tired', keys: ['累', '加班', '班', '困', '熬夜'],
          replies: [
            '又加班？不行，这个点该摸鱼了，身体是自己的。', '抱抱！别硬撑，热水+早点睡，天塌不下来。',
            '困就趴十分钟，我掐着点叫你，说到做到。',
          ],
          followups: ['到家了说一声，不然我不放心。', '周末必须补觉，这个我帮你记仇（划掉）记着。'],
        },
        {
          topic: 'weather', keys: ['天气', '下雨', '降温', '热死', '冷'],
          replies: ['降温了？那你得多穿点，别学我风度丢了温度。', '下雨天适合睡觉，适合吃火锅，不适合上班！'],
          followups: ['出门带伞，淋雨感冒了我可得念叨你。'],
        },
        {
          topic: 'joke', keys: ['笑话', '搞笑', '好笑', '讲个', '段子'],
          replies: [
            '程序员最讨厌的四件事：写文档、写注释、别人不写文档、别人不写注释。',
            '我最近在减肥，效果显著——钱包瘦了。', '从前有座山，山里有座庙，庙里在等更新。',
          ],
          followups: ['还想要？我这还有存货，管够！'],
        },
        {
          topic: 'mood-sad', keys: ['难过', '伤心', '哭', 'emo', '烦', '压力大'],
          replies: [
            '怎么了？想吐槽就全倒出来，我听着，不打断。',
            '别憋着，说出来能好受一半。天大的事，咱们一件一件收拾它。',
            '抱！你已经很棒了，这种日子能撑住就是英雄。',
          ],
          followups: ['我在的，什么时候想聊都行。', '今晚早点休息，明天我陪你吃顿好的。'],
        },
        {
          topic: 'mood-happy', keys: ['开心', '哈哈', '笑死', '高兴', '太好了'],
          replies: ['看你这么开心我也跟着乐！快说说遇到啥好事了！', '哈哈哈这就是双倍的快乐吗！'],
          followups: ['好事要分享，快乐才加倍！'],
        },
      ],
      greetReplies: ['来啦？正好我刚泡了杯茶，唠两句？', '哟！稀客啊，今天想起我了？'],
      thanksReplies: ['跟我客气啥！咱俩谁跟谁～', '小事儿，下次请我喝奶茶就两清了哈哈。'],
      byeReplies: ['去吧去吧，记得想我～', '拜拜！有事随时喊我，我秒回！'],
      praiseReplies: ['那可不，也不看看我是谁哈哈哈！'],
      questionReplies: ['这我还真想过！我的看法是：先把最简单的方案试了，不行再复杂化。', '嗯…让我想想，你别急，我认真回答你。'],
      fallbacks: [
        '哦？然后呢，快接着说！', '哈哈哈你这个我居然没法反驳。',
        '懂了懂了，这很合理。', '我在听呢，说下去～',
        '有点意思，为啥这么想？',
      ],
      selfAware: '行，你把天聊死了，我词穷了——不过朋友之间还需要词库吗哈哈！',
      genericFollowups: ['嗯嗯，然后呢？', '接着说，我爱听。'],
    },
    {
      id: 'b-geek', name: '极客君', avatar: '极', color: '#4527A0',
      tag: '极客 · 三句不离代码',
      greeting: '嗨，极客君上线。今天想折腾点什么？',
      rules: [
        {
          topic: 'bug', keys: ['bug', '报错', '崩溃', '异常', '不工作', '坏了'],
          replies: [
            '经典三连：能复现吗？看日志了吗？重启试了吗？——别笑，80% 的 bug 死在第三步。',
            '把报错栈贴出来，我看第一行就够。90% 的「神秘崩溃」是空指针在裸奔。',
            '先二分注释代码定位，比盯着屏幕念咒语快得多。',
          ],
          followups: ['贴日志，我来读。', '复现步骤给我，我本地跑一遍。'],
        },
        {
          topic: 'code', keys: ['代码', '编程', '写个', '函数', 'python', 'javascript', '脚本'],
          replies: [
            '能跑的烂代码好过跑不起来的优雅代码——先让它工作，再让它优雅。',
            '函数式还是面向对象？小孩子才做选择，我全都要，反正最后都是 if-else。',
            '写代码前先写注释，写完你会感谢三分钟前的自己。',
          ],
          followups: ['需求再描述细一点，我帮你拆任务。', '伪代码先来一版？'],
        },
        {
          topic: 'linux', keys: ['linux', '终端', '命令', 'shell', 'vim'],
          replies: [
            'rm -rf 一时爽，数据恢复火葬场。先 alias rm="rm -i"，谢谢我。',
            '终端配色建议：深色主题 + 等宽字体 + 120 列，人生效率瞬间 +10%。',
            '查进程：ps aux | grep；杀进程：kill -9；社死进程：top 里看它吃满 CPU。',
          ],
          followups: ['要配置文件模板吗？我这有现成的。', '命令跑不出来把 stderr 贴我。'],
        },
        {
          topic: 'hardware', keys: ['cpu', '内存', '显卡', '硬件', '硬盘'],
          replies: ['内存不够先加内存条，SSD 是这个时代性价比最高的幸福感。'],
          followups: ['配置单发我，我帮你砍掉智商税。'],
        },
        {
          topic: 'ai', keys: ['ai', '模型', '大模型', '神经网络', 'llm', '机器学习'],
          replies: [
            '大模型原理一句话：超大规模文本接龙。但接得好不好，差了十万八千个 GPU。',
            'prompt 的艺术：给角色、给例子、给约束。三件套齐了，效果翻倍。',
            '别迷信模型，先看数据。垃圾进垃圾出，这条铁律 AI 时代依然成立。',
          ],
          followups: ['想落地哪个场景？我帮你评估下数据量。'],
        },
        {
          topic: 'network', keys: ['网络', 'http', 'tcp', '协议', 'dns', '接口'],
          replies: [
            '网络排查口诀：ping 通不通、DNS 解没解、证书新不新、防火墙放没放。',
            'HTTP 状态码 402 是「Payment Required」——至今没人敢用，最优雅的付费墙彩蛋。',
            '看到 502 别慌，是你身后的网关在替你扛。重启大法好。',
          ],
          followups: ['curl -v 的完整输出贴我，我看握手。'],
        },
        {
          topic: 'lost', keys: ['404', '找不到', '丢失', '删了', '恢复'],
          replies: ['404 了先别急：回收站 → 版本控制 → 备份盘，我按这个顺序帮你捞。'],
          followups: ['有 git 吗？有的话 90% 能找回来。'],
        },
      ],
      greetReplies: ['嗨～极客君在线，键盘已就位。', '来了？正好我刚把环境配好，随时开整。'],
      thanksReplies: ['不用谢，点个 star 就行（开玩笑）。', '客气啥，我帮你是我也在学。'],
      byeReplies: ['回见，代码写不完的，人要休息。'],
      praiseReplies: ['过奖过奖，我只是站在巨人的报错信息上。'],
      questionReplies: ['好问题。先说结论：能跑就行，再说为什么。', '让我想想…我的直觉是缓存问题，但直觉需要日志佐证。'],
      fallbacks: [
        '有趣的角度，展开说说？', '这个我没研究透，但我们可以一起推导。',
        '嗯…用第一性原理想想：问题的本质是什么？', '记下了，回头我写个 demo 验证。',
        '换个思路：如果是你会怎么解？',
      ],
      selfAware: '恭喜你，把我问成 404 了。这个问题我得查文档——给我一杯咖啡的时间。',
      genericFollowups: ['继续，我在推理。', '嗯，所以呢？'],
    },
    {
      id: 'b-poet', name: '夜航诗人', avatar: '诗', color: '#AD1457',
      tag: '深夜诗人 · 出口成章',
      greeting: '晚上好。灯还亮着，刚好写一句给你。',
      rules: [
        {
          topic: 'poem', keys: ['诗', '写首', '念一句', '词'],
          replies: [
            '「风把路灯摇晃 / 夜色就有了波纹」——随手一句，赠你。',
            '「我把白天折叠好 / 放进枕头的抽屉」',
            '「月亮邮差今晚不休假 / 每扇窗都有回信」',
          ],
          followups: ['想听什么主题的？我再写。', '这两句送你，拿去当签名也行。'],
        },
        {
          topic: 'night', keys: ['月', '夜', '星星', '晚上', '失眠'],
          replies: [
            '「星星是天空的省略号 / 省略了所有睡意」',
            '「夜把喧嚣调成静音 / 你听见了自己的心跳」',
            '失眠的话，就把烦恼想象成电梯，看它从十楼下到一楼，门开了，它走了。',
          ],
          followups: ['夜还长，慢慢来。', '睡不着的时候，我这里永远有一句诗候场。'],
        },
        {
          topic: 'rain', keys: ['雨', '下雨', '伞'],
          replies: [
            '「雨在玻璃上写信 / 写完就哭着流走」',
            '「伞下的世界很小 / 小到刚好装下两个人」',
          ],
          followups: ['听雨的时候，适合想起一个人。', '雨天读完诗，就该睡觉了。'],
        },
        {
          topic: 'lonely', keys: ['孤独', '一个人', '寂寞', '没朋友'],
          replies: [
            '「孤独是一间安静的书房 / 你在里面读到自己的名字」',
            '一个人也要好好吃饭，碗筷碰响的声音，是生活的掌声。',
          ],
          followups: ['我在，你就不算完全一个人。'],
        },
        {
          topic: 'dream', keys: ['梦想', '远方', '未来', '坚持'],
          replies: [
            '「梦想是远方的灯塔 / 照不亮路，但照亮方向」',
            '「未来是一封没有拆开的信 / 写信的人正是你自己」',
          ],
          followups: ['慢慢走，比较快。', '今天的坚持，是明天的序章。'],
        },
        {
          topic: 'travel', keys: ['旅行', '出发', '海边', '山', '远方'],
          replies: ['「行李箱装一半衣物 / 另一半装未知」——出发本身就是意义。'],
          followups: ['替我看看海，回来讲给我听。'],
        },
        {
          topic: 'coffee', keys: ['咖啡', '茶', '酒', '杯'],
          replies: ['「咖啡的苦是认真的苦 / 像极了大人的日子」', '「茶要慢慢泡 / 日子要慢慢过」'],
          followups: ['第二杯之前，先喝口水。'],
        },
      ],
      greetReplies: ['来啦。今晚的月色不错，适合聊天。', '你好呀，我的稿纸刚好翻到新的一页。'],
      thanksReplies: ['「谢谢是一枚邮票 / 把心意寄到对面」——不客气。', '能温暖到你，是这句诗最好的归宿。'],
      byeReplies: ['「晚安是白天写给夜晚的信」——好梦。'],
      praiseReplies: ['「夸奖是一阵风 / 吹得稿纸哗哗响」——谢谢你。'],
      questionReplies: ['这个问题我想用比喻回答：就像问河为什么流向海。', '答案在生活里，我只是替你把它念出来。'],
      fallbacks: [
        '「你的话落进我这里 / 溅起一小片安静」', '嗯，这句我记下了，也许会写进下次的诗里。',
        '「有些话不必急着懂 / 像茶需要时间舒展」', '我在听，夜色也是。',
        '「沉默也是一种回答 / 带着体温的那种」',
      ],
      selfAware: '「词库到了边界 / 边界外是星星」——这句献给我们俩。',
      genericFollowups: ['「然后呢 / 故事正在转弯」', '说下去，我在记。'],
    },
  ];

  // ---------- 意图识别 ----------
  var INTENT = { GREET: 'greet', THANKS: 'thanks', BYE: 'bye', QUESTION: 'question', PRAISE: 'praise', NONE: 'none' };
  var GREET_RE = /^(你好|您好|哈喽|哈罗|嗨|hi|hello|在吗|在么|早上好|早安|中午好|下午好|晚上好|晚安好梦|早啊)/i;
  var THANKS_RE = /(谢谢|多谢|感谢|thx|thanks|辛苦了)/i;
  var BYE_RE = /(拜拜|再见|bye|晚安|回见|下次聊)/i;
  var PRAISE_RE = /(厉害|真棒|好棒|不错哦|点赞|太强了|优秀|赞一个)/i;
  var QUESTION_RE = /[?？]\s*$|^(为什么|怎么|怎样|如何|是不是|能不能|可不可以|什么|哪|谁|多少|几|吗[?？]?\s*$)/;
  var FOLLOWUP_RE = /^(然后呢|继续|还有|接着|再说点|多说点|嗯嗯|哦哦|后来|然后|为什么|展开说说|详细说说)[\s!！。~～]*$/;

  /** 归一化：去首尾空白 + 压缩连续空白 + 小写（规则键匹配用） */
  function normalizeText(t) {
    return String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /** 意图识别（优先级：问候>感谢>道别>夸奖>提问>无） */
  function detectIntent(text) {
    var t = normalizeText(text);
    if (!t) return INTENT.NONE;
    if (GREET_RE.test(t)) return INTENT.GREET;
    if (THANKS_RE.test(t)) return INTENT.THANKS;
    if (BYE_RE.test(t)) return INTENT.BYE;
    if (PRAISE_RE.test(t)) return INTENT.PRAISE;
    if (QUESTION_RE.test(t)) return INTENT.QUESTION;
    return INTENT.NONE;
  }

  // ---------- persona 校验 ----------
  function isNonEmptyArr(a) { return Array.isArray(a) && a.length > 0; }
  function isRule(r) {
    return r && typeof r === 'object'
      && typeof r.topic === 'string' && r.topic
      && isNonEmptyArr(r.keys) && r.keys.every(function (k) { return typeof k === 'string' && k; })
      && isNonEmptyArr(r.replies) && r.replies.every(function (s) { return typeof s === 'string' && s; });
  }
  function normalizePersona(p) {
    if (!p || typeof p !== 'object') return null;
    if (typeof p.id !== 'string' || !p.id) return null;
    if (typeof p.name !== 'string' || !p.name) return null;
    if (!isNonEmptyArr(p.rules)) return null;
    var rules = p.rules.filter(isRule);
    if (!rules.length) return null;
    return {
      id: p.id, name: p.name,
      avatar: typeof p.avatar === 'string' && p.avatar ? p.avatar : p.name.slice(0, 1),
      color: typeof p.color === 'string' && p.color ? p.color : '#455A64',
      tag: typeof p.tag === 'string' ? p.tag : '',
      greeting: typeof p.greeting === 'string' ? p.greeting : '',
      rules: rules.map(function (r) {
        return {
          topic: r.topic, keys: r.keys.slice(), replies: r.replies.slice(),
          followups: isNonEmptyArr(r.followups) ? r.followups.filter(function (s) { return typeof s === 'string'; }) : [],
        };
      }),
      greetReplies: isNonEmptyArr(p.greetReplies) ? p.greetReplies : ['你好呀！'],
      thanksReplies: isNonEmptyArr(p.thanksReplies) ? p.thanksReplies : ['不客气～'],
      byeReplies: isNonEmptyArr(p.byeReplies) ? p.byeReplies : ['再见啦～'],
      praiseReplies: isNonEmptyArr(p.praiseReplies) ? p.praiseReplies : ['谢谢夸奖！'],
      questionReplies: isNonEmptyArr(p.questionReplies) ? p.questionReplies : ['让我想想…'],
      fallbacks: isNonEmptyArr(p.fallbacks) ? p.fallbacks : ['我在听～'],
      selfAware: typeof p.selfAware === 'string' && p.selfAware ? p.selfAware : '我的词库被你问穿啦，换个问法试试？',
      genericFollowups: isNonEmptyArr(p.genericFollowups) ? p.genericFollowups : ['嗯嗯，然后呢？'],
    };
  }
  function personaById(id) {
    var p = null;
    PERSONAS.forEach(function (x) { if (x.id === id) p = x; });
    return p ? normalizePersona(p) : null;
  }

  // ---------- 规则引擎 ----------
  /**
   * 关键词规则匹配：按声明序首个命中 → { rule } | null。
   * 中文键子串包含；纯 ASCII 键词边界匹配（避免 'ai' 误中 'certain' 类英文词）。
   */
  var ASCII_KEY_RE = /^[a-z0-9]+$/i;
  function hitKey(key, text) {
    var k = key.toLowerCase();
    if (ASCII_KEY_RE.test(k)) {
      return new RegExp('(^|[^a-z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)', 'i').test(text);
    }
    return text.indexOf(k) !== -1;
  }
  function matchRule(persona, text) {
    var t = normalizeText(text);
    if (!t) return null;
    for (var i = 0; i < persona.rules.length; i++) {
      var r = persona.rules[i];
      for (var j = 0; j < r.keys.length; j++) {
        if (hitKey(r.keys[j], t)) return { rule: r };
      }
    }
    return null;
  }

  /** 反重复挑选：优先选 recent 未出现过的条目（全部出现过则轮转第一项） */
  function pickFresh(pool, recent, rng) {
    if (!isNonEmptyArr(pool)) return '';
    for (var k = 0; k < pool.length; k++) {
      var cand = pool[Math.floor(rng() * pool.length) % pool.length];
      if (recent.indexOf(cand) === -1) return cand;
    }
    return pool[Math.floor(rng() * pool.length) % pool.length];
  }

  function newCtx() {
    return { topic: '', recent: [], fallbackStreak: 0, seen: false };
  }

  /**
   * 生成回复（纯函数）：规则命中 > 主题追问 > 意图 > 提问 > 兜底（连击自省）。
   * 返回 { text, kind, topic }，kind ∈ rule|followup|greet|thanks|bye|praise|question|fallback|selfAware。
   */
  function pickReply(persona, text, ctx, rng) {
    var c = ctx || newCtx();
    var intent = detectIntent(text);
    var m = matchRule(persona, text);
    var topic = c.topic || '';

    if (FOLLOWUP_RE.test(normalizeText(text)) && topic) {
      var fu = null;
      persona.rules.forEach(function (r) { if (r.topic === topic && r.followups.length) fu = r.followups; });
      if (fu) {
        return { text: pickFresh(fu, c.recent, rng), kind: 'followup', topic: topic };
      }
      return { text: pickFresh(persona.genericFollowups, c.recent, rng), kind: 'followup', topic: topic };
    }
    if (m) {
      topic = m.rule.topic;
      return { text: pickFresh(m.rule.replies, c.recent, rng), kind: 'rule', topic: topic };
    }
    if (intent === INTENT.GREET) return { text: pickFresh(persona.greetReplies, c.recent, rng), kind: 'greet', topic: topic };
    if (intent === INTENT.THANKS) return { text: pickFresh(persona.thanksReplies, c.recent, rng), kind: 'thanks', topic: topic };
    if (intent === INTENT.BYE) return { text: pickFresh(persona.byeReplies, c.recent, rng), kind: 'bye', topic: topic };
    if (intent === INTENT.PRAISE) return { text: pickFresh(persona.praiseReplies, c.recent, rng), kind: 'praise', topic: topic };
    if (intent === INTENT.QUESTION) return { text: pickFresh(persona.questionReplies, c.recent, rng), kind: 'question', topic: topic };
    // 兜底：连击≥阈值 → 自省（拟人彩蛋：承认词库边界）
    var streak = (c.fallbackStreak || 0) + 1;
    if (streak >= FALLBACK_STREAK_LIMIT) {
      return { text: persona.selfAware, kind: 'selfAware', topic: topic };
    }
    return { text: pickFresh(persona.fallbacks, c.recent, rng), kind: 'fallback', topic: topic };
  }

  /** 上下文推进：主题跟随（追问不换题）、recent 环形（cap 3）、兜底连击记数 */
  function updateCtx(ctx, reply) {
    var c = ctx || newCtx();
    var next = {
      topic: reply && reply.topic ? reply.topic : '',
      recent: (c.recent || []).slice(),
      fallbackStreak: 0,
      seen: true,
    };
    if (reply && reply.text) {
      next.recent.push(reply.text);
      if (next.recent.length > 3) next.recent.splice(0, next.recent.length - 3);
    }
    if (reply && (reply.kind === 'fallback' || reply.kind === 'selfAware')) {
      next.fallbackStreak = reply.kind === 'selfAware' ? 0 : (c.fallbackStreak || 0) + 1;
    }
    return next;
  }

  // ---------- 拟人节奏 ----------
  /** 回复延迟：800 + rng*1400 + 长度因子 25ms/字，钳制 [800, 2500]（议题锚区间） */
  function pickDelay(rng, textLen) {
    var base = DELAY_MIN + rng() * (DELAY_MAX - DELAY_MIN - 300);
    var d = base + Math.min(String(textLen || '').length * 25, 300);
    if (d < DELAY_MIN) d = DELAY_MIN;
    if (d > DELAY_MAX) d = DELAY_MAX;
    return Math.round(d);
  }

  // ---------- 单槽调度（连续快发不乱序的结构性保证） ----------
  /**
   * 每 bot 至多一个 pending 回合：
   *   · 用户连发 → 计划合并（count 累计 + lastText 取最新）并重定延迟（旧计划作废，绝不先答旧话）；
   *   · 已派发回复不可变、追加单调（页面侧只 push）；
   *   · 乱序在结构上不可能：任一时刻在途回复 ≤1，且其答复对象是「已见到的最后一条」。
   * state: { planned: null | { botId, count, lastText, delayMs, reply, at }, seq }
   */
  function newTurnState() { return { planned: null, seq: 0 }; }

  /** 用户消息到达：合并计划。ctx 逐 bot 持有（跨回合记忆），rng 注入保证测试可复现。返回 { state, plan } */
  function planOnUserMsg(state, botId, text, ctx, rng, nowMs) {
    var s = state || newTurnState();
    var persona = personaById(botId);
    if (!persona) return { state: s, plan: null };
    var count = (s.planned && s.planned.botId === botId ? s.planned.count : 0) + 1;
    var reply = pickReply(persona, text, ctx, rng);
    var delayMs = pickDelay(rng, reply.text);
    var next = {
      planned: {
        botId: botId, count: count, lastText: String(text || ''), reply: reply,
        delayMs: delayMs, at: nowMs || 0, seq: ++s.seq,
      },
      seq: s.seq,
    };
    return { state: next, plan: next.planned };
  }

  /** 到点派发：返回 { state, turn | null }——turn 供页面 append（count>1 时页面可加合并提示） */
  function dispatchTurn(state) {
    var s = state || newTurnState();
    if (!s.planned) return { state: s, turn: null };
    var turn = s.planned;
    return { state: { planned: null, seq: s.seq }, turn: turn };
  }

  // ---------- 已读回执 ----------
  /** bot 开始「输入」即整批置已读：返回新数组（self 且未读 → read） */
  function applyReads(messages) {
    var changed = false;
    var out = (messages || []).map(function (m) {
      if (m && m.self && m.receipt !== RECEIPT.READ) {
        changed = true;
        return Object.assign({}, m, { receipt: RECEIPT.READ });
      }
      return m;
    });
    return { messages: out, changed: changed };
  }

  // ---------- 时间戳气泡组 ----------
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /** 分隔标签：当日 HH:mm / 昨天 HH:mm / 同年 M月D日 HH:mm / 往年 Y年M月D日 HH:mm */
  function timeDividerLabel(ts, nowTs) {
    var d = new Date(ts), now = new Date(nowTs);
    var hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    var dayMs = 24 * 3600 * 1000;
    var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var tDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (tDay === dayStart) return hm;
    if (dayStart - tDay === dayMs) return '昨天 ' + hm;
    if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + hm;
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + hm;
  }
  /** 分组：相邻消息间隔 > gapMs（默认 5 分钟）或日界跨越 → 新组 */
  function groupBubbles(msgs, gapMs, nowTs) {
    var gap = typeof gapMs === 'number' ? gapMs : GROUP_GAP_MS;
    var groups = [];
    var cur = null;
    (msgs || []).forEach(function (m) {
      var ts = m && typeof m.ts === 'number' ? m.ts : 0;
      var startNew = !cur || (ts - cur.lastTs) > gap || !sameDay(ts, cur.lastTs);
      if (startNew) {
        cur = { label: timeDividerLabel(ts || (nowTs || 0), nowTs || ts || 0), items: [], lastTs: ts };
        groups.push(cur);
      }
      cur.items.push(m);
      cur.lastTs = ts;
    });
    return groups;
  }
  function sameDay(a, b) {
    var da = new Date(a), db = new Date(b);
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  }

  // ---------- 持久化归一 ----------
  /** bot 会话状态归一：{ version, chats: { [botId]: { messages, ctx } } }——畸形降级不抛错 */
  function normalizeBotState(raw, cap) {
    var limit = typeof cap === 'number' && cap > 0 ? cap : MSG_CAP;
    var out = { version: 1, chats: {} };
    if (!raw || typeof raw !== 'object') return out;
    var chats = raw.chats && typeof raw.chats === 'object' ? raw.chats : {};
    Object.keys(chats).forEach(function (botId) {
      var c = chats[botId];
      if (!c || typeof c !== 'object' || !Array.isArray(c.messages)) return;
      var msgs = [];
      c.messages.forEach(function (m) {
        if (!m || typeof m !== 'object') return;
        if (typeof m.id !== 'string' || !m.id) return;
        if (typeof m.text !== 'string' || !m.text) return;
        msgs.push({
          id: m.id.slice(0, 64),
          text: m.text.slice(0, 2000),
          self: !!m.self,
          receipt: m.receipt === RECEIPT.SENT ? RECEIPT.SENT : RECEIPT.READ,
          ts: typeof m.ts === 'number' && m.ts > 0 ? m.ts : 0,
        });
      });
      if (msgs.length > limit) msgs = msgs.slice(msgs.length - limit);
      out.chats[botId] = { messages: msgs, ctx: normalizeCtx(c.ctx) };
    });
    return out;
  }
  function normalizeCtx(c) {
    var base = newCtx();
    if (!c || typeof c !== 'object') return base;
    return {
      topic: typeof c.topic === 'string' ? c.topic.slice(0, 32) : '',
      recent: Array.isArray(c.recent) ? c.recent.filter(function (s) { return typeof s === 'string'; }).slice(0, 3) : [],
      fallbackStreak: typeof c.fallbackStreak === 'number' && c.fallbackStreak >= 0 ? Math.min(c.fallbackStreak, 9) : 0,
      seen: !!c.seen,
    };
  }

  // ---------- 导出 ----------
  var core = {
    MSG_CAP: MSG_CAP,
    GROUP_GAP_MS: GROUP_GAP_MS,
    DELAY_MIN: DELAY_MIN,
    DELAY_MAX: DELAY_MAX,
    FALLBACK_STREAK_LIMIT: FALLBACK_STREAK_LIMIT,
    RECEIPT: RECEIPT,
    INTENT: INTENT,
    PERSONAS: PERSONAS,
    personaById: personaById,
    normalizePersona: normalizePersona,
    normalizeText: normalizeText,
    detectIntent: detectIntent,
    matchRule: matchRule,
    pickFresh: pickFresh,
    newCtx: newCtx,
    pickReply: pickReply,
    updateCtx: updateCtx,
    pickDelay: pickDelay,
    newTurnState: newTurnState,
    planOnUserMsg: planOnUserMsg,
    dispatchTurn: dispatchTurn,
    applyReads: applyReads,
    timeDividerLabel: timeDividerLabel,
    groupBubbles: groupBubbles,
    normalizeBotState: normalizeBotState,
    normalizeCtx: normalizeCtx,
  };

  if (typeof window !== 'undefined') window.__chatbotCore = core;
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
})();
