// ==================== word-core.js — #28 每日单词核心（v8.39） ====================
//
// 经典脚本 IIFE（v8.38 fx-core 同款模式：iframe 经典 <script> 下 ESM export 会整文件
// SyntaxError，module defer 时序又晚于主脚本 → 挂 window.__wordCore，页面以
// <script src="../../js/word-core.js"> 两级上行同步加载，vitest 用 new Function 沙箱提取）。
// 顶层零副作用（不碰 document/localStorage/window），唯一出口 window.__wordCore。
//
// #28 执行要点逐条落锚：
//   词库内置（CET-4 核心 500 词起步 → 实际 554 词，字段 word/pos/meaning）
//   艾宾浩斯复习队列：今日新词 + 到期复习词；localStorage 进度
//   复习调度纯函数化可单测（#28 验收原文）
//   断网全功能：词库 + Web Speech 发音零音频文件零网络
(function () {
  'use strict';

  // ---------- CET-4 核心词库（554 词，字母序，字段 word/pos/meaning） ----------
  var RAW = [
    // ---- A ----
    ["abandon","v.","放弃，抛弃"],
    ["ability","n.","能力，才能"],
    ["abnormal","adj.","反常的，异常的"],
    ["aboard","adv.","在船（车）上；上船"],
    ["abolish","v.","废除，取消"],
    ["absorb","v.","吸收；使专心"],
    ["abstract","adj.","抽象的 n. 摘要"],
    ["absurd","adj.","荒谬的，荒唐的"],
    ["abundant","adj.","丰富的，充裕的"],
    ["abuse","v.","滥用；虐待"],
    ["academic","adj.","学术的；学院的"],
    ["accelerate","v.","加速，促进"],
    ["accent","n.","口音，重音"],
    ["access","n.","通道；使用权 v. 存取"],
    ["accidental","adj.","意外的，偶然的"],
    ["accompany","v.","陪伴，伴随"],
    ["accomplish","v.","完成，达到"],
    ["account","n.","账户；描述 v. 说明"],
    ["accumulate","v.","积累，堆积"],
    ["accurate","adj.","准确的，精确的"],
    ["accuse","v.","指责，控告"],
    ["accustom","v.","使习惯"],
    ["achieve","v.","达到，完成"],
    ["acknowledge","v.","承认；致谢"],
    ["acquaint","v.","使熟悉，使认识"],
    ["acquire","v.","获得，学到"],
    ["adapt","v.","使适应；改编"],
    ["addition","n.","加法；附加物"],
    ["adequate","adj.","足够的，恰当的"],
    ["adjust","v.","调整，调节"],
    ["administration","n.","管理；行政部门"],
    ["admire","v.","钦佩，赞赏"],
    ["admission","n.","准入；承认"],
    ["adopt","v.","采用；收养"],
    ["advance","v.","前进 n. 进展"],
    ["advantage","n.","优势，有利条件"],
    ["adventure","n.","冒险，奇遇"],
    ["advertise","v.","做广告，宣传"],
    ["advocate","v.","提倡 n. 拥护者"],
    ["affair","n.","事务，事件"],
    ["affect","v.","影响；感动"],
    // ---- B ----
    ["bachelor","n.","学士；单身汉"],
    ["background","n.","背景，经历"],
    ["bacteria","n.","细菌"],
    ["baggage","n.","行李"],
    ["balance","n.","平衡；余额 v. 权衡"],
    ["ban","v.","禁止 n. 禁令"],
    ["bandage","n.","绷带"],
    ["bare","adj.","赤裸的；仅有的"],
    ["bargain","n.","交易 v. 讨价还价"],
    ["barrier","n.","障碍，屏障"],
    ["battery","n.","电池（组）"],
    ["beam","n.","梁；光束 v. 微笑"],
    ["betray","v.","背叛，泄露"],
    ["bid","v.","出价 n. 投标"],
    ["bind","v.","捆绑，装订"],
    ["bitter","adj.","苦的；痛苦的"],
    ["blame","v.","责备 n. 责任"],
    ["blank","adj.","空白的 n. 空格"],
    ["blast","n.","爆炸 v. 爆破"],
    ["bleed","v.","流血，出血"],
    ["blend","v.","混合 n. 混合物"],
    ["bless","v.","祝福，保佑"],
    ["bloom","n.","花 v. 开花"],
    ["boast","v.","自夸，夸耀"],
    ["boil","v.","煮沸，沸腾"],
    ["bolt","n.","螺栓；闪电 v. 逃跑"],
    ["bomb","n.","炸弹 v. 轰炸"],
    ["bond","n.","纽带；债券"],
    ["bonus","n.","奖金，红利"],
    ["boom","n.","繁荣 v. 激增"],
    ["border","n.","边界 v. 接界"],
    ["bore","v.","使厌烦 n. 讨厌的人"],
    ["bounce","v.","弹跳，反弹"],
    ["boundary","n.","边界，分界线"],
    ["brand","n.","商标，品牌"],
    ["breath","n.","呼吸，气息"],
    ["brief","adj.","简短的 v. 作摘要"],
    ["brilliant","adj.","杰出的；明亮的"],
    ["broad","adj.","宽的，广阔的"],
    ["browse","v.","浏览，翻阅"],
    // ---- C ----
    ["cabinet","n.","橱柜；内阁"],
    ["cable","n.","电缆；电报"],
    ["calculate","v.","计算，估计"],
    ["campaign","n.","运动；战役"],
    ["campus","n.","校园"],
    ["candidate","n.","候选人，应试者"],
    ["capable","adj.","有能力的"],
    ["capacity","n.","容量；能力"],
    ["career","n.","生涯，职业"],
    ["cargo","n.","货物，船货"],
    ["carve","v.","雕刻，切开"],
    ["casual","adj.","随便的；偶然的"],
    ["catalog","n.","目录 v. 编目"],
    ["cease","v.","停止，终止"],
    ["celebrate","v.","庆祝，祝贺"],
    ["ceremony","n.","典礼，仪式"],
    ["certificate","n.","证书，证明书"],
    ["challenge","n.","挑战 v. 质疑"],
    ["chamber","n.","房间；议院"],
    ["charge","v.","收费；指控 n. 费用"],
    ["chase","v.","追逐，追赶"],
    ["cheat","v.","欺骗 n. 骗子"],
    ["cheer","v.","欢呼；使振奋"],
    ["chemical","adj.","化学的 n. 化学品"],
    ["cherish","v.","珍爱；怀有"],
    ["chew","v.","咀嚼，咬"],
    ["chief","adj.","首要的 n. 首领"],
    ["civil","adj.","公民的；国内的"],
    ["civilize","v.","使文明，开化"],
    ["claim","v.","声称；索取 n. 主张"],
    ["clarify","v.","澄清，阐明"],
    ["classic","adj.","经典的 n. 名著"],
    ["classify","v.","分类，分级"],
    ["clause","n.","条款；从句"],
    ["client","n.","客户，委托人"],
    ["clue","n.","线索，提示"],
    ["coach","n.","教练 v. 辅导"],
    ["coal","n.","煤，煤块"],
    ["coarse","adj.","粗糙的，粗俗的"],
    ["code","n.","密码；法规 v. 编码"],
    ["collapse","v.","倒塌 n. 崩溃"],
    ["colleague","n.","同事，同僚"],
    ["commerce","n.","商业，贸易"],
    ["commission","n.","委员会；佣金"],
    ["commit","v.","犯（罪）；承诺"],
    // ---- D ----
    ["debate","n.","辩论，争论"],
    ["debt","n.","债务，欠款"],
    ["decade","n.","十年"],
    ["decent","adj.","体面的；正派的"],
    ["declare","v.","宣布，声明"],
    ["decline","v.","下降；婉拒 n. 衰退"],
    ["decorate","v.","装饰，布置"],
    ["decrease","v.","减少 n. 降低"],
    ["dedicate","v.","奉献，致力于"],
    ["defeat","v.","击败 n. 失败"],
    ["defect","n.","缺陷，瑕疵"],
    ["defend","v.","防守；辩护"],
    ["define","v.","定义，限定"],
    ["delegate","n.","代表 v. 委派"],
    ["deliberate","adj.","故意的 v. 深思"],
    ["delicate","adj.","精致的；脆弱的"],
    ["deliver","v.","递送；发表"],
    ["demand","v.","要求 n. 需求"],
    ["democracy","n.","民主，民主制"],
    ["demonstrate","v.","证明；演示"],
    ["deny","v.","否认，拒绝"],
    ["depart","v.","离开，出发"],
    ["deposit","n.","存款 v. 存放"],
    ["depress","v.","使沮丧；压下"],
    ["deputy","n.","副职；代表"],
    ["derive","v.","源自，取得"],
    ["descend","v.","下降，遗传"],
    ["describe","v.","描述，形容"],
    ["desert","n.","沙漠 v. 抛弃"],
    ["deserve","v.","应得，值得"],
    ["desire","n.","渴望 v. 期望"],
    ["despair","n.","绝望 v. 失望"],
    ["destiny","n.","命运，天数"],
    ["destroy","v.","破坏，摧毁"],
    ["detect","v.","察觉，探测"],
    // ---- E ----
    ["economy","n.","经济，节约"],
    ["elaborate","adj.","精心的 v. 详述"],
    ["elastic","adj.","有弹性的 n. 橡皮筋"],
    ["elect","v.","选举，推选"],
    ["election","n.","选举，当选"],
    ["electric","adj.","电的，电动的"],
    ["elegant","adj.","优雅的，雅致的"],
    ["element","n.","元素；成分"],
    ["embarrass","v.","使尴尬，使窘迫"],
    ["embrace","v.","拥抱；接受"],
    ["emerge","v.","出现，浮现"],
    ["emergency","n.","紧急情况"],
    ["emotion","n.","情感，情绪"],
    ["emperor","n.","皇帝"],
    ["emphasize","v.","强调，着重"],
    ["empire","n.","帝国"],
    ["employ","v.","雇用；使用"],
    ["encounter","v.","遭遇 n. 相遇"],
    ["endure","v.","忍受；持久"],
    ["enforce","v.","执行；强制"],
    ["engage","v.","从事；聘用"],
    ["enormous","adj.","巨大的，庞大的"],
    ["enquire","v.","询问，打听"],
    ["ensure","v.","确保，保证"],
    ["entitle","v.","使有权；授权"],
    ["environment","n.","环境，周围状况"],
    ["envy","v.","羡慕 n. 嫉妒"],
    ["equality","n.","平等，相等"],
    ["evaluate","v.","评估，估价"],
    ["evidence","n.","证据，迹象"],
    // ---- F ----
    ["fabric","n.","织物；结构"],
    ["facility","n.","设施；便利"],
    ["factor","n.","因素，要素"],
    ["faculty","n.","才能；全体教员"],
    ["fade","v.","褪色，凋谢"],
    ["failure","n.","失败；故障"],
    ["faint","adj.","微弱的 v. 昏倒"],
    ["faith","n.","信任；信仰"],
    ["faithful","adj.","忠实的，忠诚的"],
    ["fame","n.","名声，声誉"],
    ["fancy","n.","想象 v. 喜爱 adj. 花哨的"],
    ["farewell","n.","告别 int. 再会"],
    ["fascinate","v.","使着迷，迷住"],
    ["fashion","n.","时尚，方式"],
    ["fasten","v.","系紧，固定"],
    ["fatal","adj.","致命的，重大的"],
    ["fate","n.","命运，天数"],
    ["fault","n.","过错；故障"],
    ["favor","n.","恩惠 v. 赞成"],
    ["feasible","adj.","可行的"],
    ["feast","n.","盛宴，节日"],
    ["feature","n.","特征；面貌"],
    ["federal","adj.","联邦的"],
    ["fee","n.","费用，酬金"],
    ["fellow","n.","伙伴 adj. 同伴的"],
    ["female","adj.","女性的 n. 女子"],
    ["fertile","adj.","肥沃的；多产的"],
    ["fiction","n.","小说；虚构"],
    ["fierce","adj.","凶猛的，激烈的"],
    ["figure","n.","数字；人物 v. 认为"],
    // ---- G ----
    ["gain","v.","获得 n. 收益"],
    ["gallery","n.","画廊，美术馆"],
    ["gap","n.","缺口；差距"],
    ["garage","n.","车库；修车厂"],
    ["garbage","n.","垃圾，废物"],
    ["gasp","v.","喘气 n. 倒吸一口气"],
    ["gauge","n.","计量器 v. 测量"],
    ["gaze","v.","凝视 n. 注视"],
    ["gene","n.","基因，遗传因子"],
    ["general","adj.","普通的 n. 将军"],
    ["generate","v.","产生，发生"],
    ["generous","adj.","慷慨的，大方的"],
    ["genuine","adj.","真正的，真诚的"],
    ["gesture","n.","姿势，手势"],
    ["glance","v.","匆匆一看 n. 一瞥"],
    ["glimpse","n.","一瞥 v. 瞥见"],
    ["gloomy","adj.","阴暗的；忧郁的"],
    ["glory","n.","荣誉，光荣"],
    ["gossip","n.","流言 v. 说闲话"],
    ["govern","v.","统治，管理"],
    // ---- H ----
    ["halt","v.","停止 n. 暂停"],
    ["hamper","v.","妨碍，阻碍"],
    ["handful","n.","一把；少数"],
    ["handy","adj.","便利的；手巧的"],
    ["harbor","n.","港口 v. 藏匿"],
    ["harm","n.","伤害 v. 损害"],
    ["harmony","n.","和谐，融洽"],
    ["harsh","adj.","严厉的；刺耳的"],
    ["haste","n.","匆忙，急忙"],
    ["hatred","n.","憎恨，仇恨"],
    ["hazard","n.","危险，公害"],
    ["heal","v.","治愈，愈合"],
    ["heap","n.","堆 v. 堆积"],
    ["heaven","n.","天堂；天空"],
    ["hedge","n.","树篱 v. 回避"],
    ["hence","adv.","因此，从此"],
    ["heritage","n.","遗产，传统"],
    ["hesitate","v.","犹豫，踌躇"],
    ["highlight","v.","强调 n. 亮点"],
    ["hollow","adj.","空的；空洞的"],
    // ---- I ----
    ["identical","adj.","完全相同的"],
    ["identify","v.","识别，鉴定"],
    ["identity","n.","身份；同一性"],
    ["idle","adj.","空闲的；懒散的"],
    ["ignorance","n.","无知，愚昧"],
    ["illustrate","v.","说明，图解"],
    ["image","n.","形象；图像"],
    ["imitate","v.","模仿，仿效"],
    ["immense","adj.","巨大的，广大的"],
    ["immune","adj.","免疫的；免除的"],
    ["impact","n.","冲击 v. 影响"],
    ["impartial","adj.","公正的，不偏的"],
    ["implement","v.","实施 n. 工具"],
    ["imply","v.","暗示，意指"],
    ["impose","v.","强加；征税"],
    ["impress","v.","使印象深刻"],
    ["improve","v.","改进，提高"],
    ["impulse","n.","冲动；脉冲"],
    ["incident","n.","事件，事变"],
    ["include","v.","包含，包括"],
    ["indicate","v.","表明，指示"],
    ["indifferent","adj.","冷漠的，不关心的"],
    ["individual","adj.","个人的 n. 个人"],
    ["indulge","v.","放纵，沉溺"],
    ["inevitable","adj.","不可避免的"],
    ["infect","v.","感染，传染"],
    ["infer","v.","推断，推论"],
    ["inflation","n.","通货膨胀"],
    ["influence","n.","影响 v. 感化"],
    ["ingredient","n.","成分，配料"],
    // ---- J ----
    ["jail","n.","监狱 v. 监禁"],
    ["jam","n.","果酱；堵塞 v. 挤满"],
    ["jealous","adj.","嫉妒的，猜疑的"],
    ["joint","adj.","共同的 n. 关节"],
    ["journal","n.","期刊；日记"],
    // ---- K ----
    ["keen","adj.","热心的；敏锐的"],
    ["kneel","v.","跪下，跪着"],
    ["knit","v.","编织；结合"],
    ["knob","n.","球形把手，旋钮"],
    ["knot","n.","结 v. 打结"],
    // ---- L ----
    ["label","n.","标签 v. 标注"],
    ["lag","v.","走得慢 n. 滞后"],
    ["launch","v.","发射；发起"],
    ["lawyer","n.","律师"],
    ["lean","v.","倾斜；倚"],
    ["leap","v.","跳跃 n. 激增"],
    ["lease","n.","租约 v. 出租"],
    ["leather","n.","皮革，皮制品"],
    ["legal","adj.","合法的；法律的"],
    ["legislation","n.","立法，法规"],
    ["leisure","n.","闲暇，悠闲"],
    ["liable","adj.","易于…的；有责任的"],
    ["liberal","adj.","开明的；自由的"],
    ["liberate","v.","解放，释放"],
    ["license","n.","执照 v. 许可"],
    ["likewise","adv.","同样地，也"],
    ["limb","n.","肢；大树枝"],
    ["limitation","n.","限制；局限"],
    ["literature","n.","文学；文献"],
    ["litter","n.","垃圾 v. 乱扔"],
    // ---- M ----
    ["magnificent","adj.","壮丽的，宏伟的"],
    ["maintain","v.","维持；保养"],
    ["majority","n.","多数，大多数"],
    ["management","n.","管理；管理层"],
    ["manifest","v.","显示 adj. 明显的"],
    ["manipulate","v.","操纵，控制"],
    ["manner","n.","方式；礼貌"],
    ["manual","adj.","手工的 n. 手册"],
    ["manufacture","v.","制造 n. 制造业"],
    ["margin","n.","边缘；利润"],
    ["marine","adj.","海的；海产的"],
    ["marvelous","adj.","奇迹般的，惊人的"],
    ["massive","adj.","大而重的；大规模的"],
    ["mature","adj.","成熟的 v. 成熟"],
    ["maximum","n.","最大值 adj. 最大的"],
    ["meanwhile","adv.","与此同时"],
    ["measure","v.","测量 n. 措施"],
    ["mechanism","n.","机制；机械装置"],
    ["melt","v.","融化，熔化"],
    ["memorial","n.","纪念碑 adj. 纪念的"],
    ["mental","adj.","精神的，智力的"],
    ["mercy","n.","仁慈，宽恕"],
    ["merge","v.","合并，融合"],
    ["merit","n.","优点，价值"],
    ["midst","n.","中间，当中"],
    ["migrate","v.","迁移，移居"],
    ["mineral","n.","矿物 adj. 矿物的"],
    ["ministry","n.","（政府的）部"],
    ["misery","n.","痛苦，悲惨"],
    ["mist","n.","薄雾"],
    // ---- N ----
    ["naked","adj.","裸露的，无遮盖的"],
    ["namely","adv.","即，也就是"],
    ["narrate","v.","叙述，讲述"],
    ["nasty","adj.","脏的；恶意的"],
    ["nationality","n.","国籍；民族"],
    ["naval","adj.","海军的"],
    ["navigation","n.","航行；导航"],
    ["necessity","n.","必要性；必需品"],
    ["negative","adj.","消极的；阴性的"],
    ["neglect","v.","忽视 n. 疏忽"],
    ["negotiate","v.","谈判，协商"],
    ["nerve","n.","神经；勇气"],
    ["neutral","adj.","中立的，中性的"],
    ["nonsense","n.","胡说，废话"],
    ["notion","n.","概念，观念"],
    // ---- O ----
    ["oath","n.","誓言，誓约"],
    ["obey","v.","服从，听从"],
    ["object","n.","物体；目标 v. 反对"],
    ["objection","n.","反对，异议"],
    ["obligation","n.","义务，责任"],
    ["oblige","v.","迫使；施恩"],
    ["observe","v.","观察；遵守"],
    ["obstacle","n.","障碍，妨碍物"],
    ["obtain","v.","获得，得到"],
    ["obvious","adj.","明显的，显然的"],
    ["occasion","n.","场合；时机"],
    ["occupy","v.","占据；使忙碌"],
    ["occur","v.","发生；出现"],
    ["odd","adj.","奇怪的；奇数的"],
    ["offend","v.","冒犯，得罪"],
    ["offensive","adj.","冒犯的 n. 进攻"],
    ["omit","v.","省略，遗漏"],
    ["opponent","n.","对手，敌手"],
    ["oppress","v.","压迫，压制"],
    ["optimistic","adj.","乐观的"],
    // ---- P ----
    ["pace","n.","步伐；速度"],
    ["panel","n.","面板；专门小组"],
    ["parade","n.","游行 v. 列队行进"],
    ["parallel","adj.","平行的 n. 类似"],
    ["parcel","n.","包裹，小包"],
    ["parliament","n.","议会，国会"],
    ["partial","adj.","部分的；偏袒的"],
    ["participate","v.","参加，参与"],
    ["partner","n.","伙伴，搭档"],
    ["passion","n.","激情，热情"],
    ["passive","adj.","被动的，消极的"],
    ["patent","n.","专利 adj. 专利的"],
    ["patience","n.","耐心，忍耐"],
    ["patriotic","adj.","爱国的"],
    ["peak","n.","山峰；顶点"],
    ["peculiar","adj.","奇怪的；特有的"],
    ["penalty","n.","处罚，罚款"],
    ["pension","n.","养老金，退休金"],
    ["perceive","v.","感知，察觉"],
    ["perform","v.","表演；执行"],
    ["permanent","adj.","永久的，持久的"],
    ["permit","v.","允许 n. 许可证"],
    ["persist","v.","坚持；持续"],
    ["personnel","n.","全体人员；人事"],
    ["perspective","n.","视角；远景"],
    ["persuade","v.","说服，劝服"],
    ["philosophy","n.","哲学；人生观"],
    ["physical","adj.","身体的；物质的"],
    ["plunge","v.","跳入；暴跌"],
    ["poison","n.","毒药 v. 毒害"],
    ["polish","v.","擦亮；润色"],
    ["pollute","v.","污染，弄脏"],
    ["portion","n.","一部分；一份"],
    ["positive","adj.","积极的；肯定的"],
    ["possess","v.","拥有，占有"],
    ["postpone","v.","推迟，延期"],
    ["poverty","n.","贫穷，贫困"],
    ["practical","adj.","实际的；实用的"],
    ["precaution","n.","预防，警惕"],
    ["predict","v.","预言，预测"],
    // ---- Q ----
    ["qualify","v.","使合格，取得资格"],
    ["quantity","n.","量，数量"],
    ["quit","v.","停止；辞职"],
    ["quiz","n.","小测验 v. 盘问"],
    ["quota","n.","定额，限额"],
    // ---- R ----
    ["radiation","n.","辐射，放射"],
    ["radical","adj.","激进的；根本的"],
    ["railway","n.","铁路"],
    ["rainbow","n.","彩虹"],
    ["rate","n.","比率；速度 v. 评价"],
    ["ratio","n.","比，比率"],
    ["rational","adj.","理性的，合理的"],
    ["raw","adj.","生的；未加工的"],
    ["react","v.","反应，起作用"],
    ["realistic","adj.","现实的，逼真的"],
    ["receipt","n.","收据，收到"],
    ["reception","n.","接待；招待会"],
    ["reckon","v.","认为；测算"],
    ["recommend","v.","推荐，劝告"],
    ["recover","v.","恢复，痊愈"],
    ["recruit","v.","招募 n. 新兵"],
    ["refine","v.","精炼，提纯"],
    ["reflect","v.","反射；反思"],
    ["reform","v.","改革 n. 改良"],
    ["refuge","n.","避难所，庇护"],
    ["refuse","v.","拒绝 n. 垃圾"],
    ["regulate","v.","管理；调整"],
    ["reinforce","v.","加强，增援"],
    ["reject","v.","拒绝，退回"],
    ["relate","v.","有关；叙述"],
    ["relief","n.","缓解；救济"],
    ["relieve","v.","减轻，解除"],
    ["remind","v.","提醒，使想起"],
    ["reluctant","adj.","不情愿的"],
    ["remark","v.","评论 n. 言辞"],
    // ---- S ----
    ["sacrifice","n.","牺牲 v. 献出"],
    ["sample","n.","样品 v. 抽样"],
    ["satisfy","v.","满足；使满意"],
    ["scatter","v.","分散，驱散"],
    ["scene","n.","场景，景色"],
    ["schedule","n.","计划 v. 安排"],
    ["scheme","n.","计划；阴谋"],
    ["scold","v.","责骂，训斥"],
    ["scope","n.","范围；余地"],
    ["scratch","v.","抓 n. 抓痕"],
    ["secondary","adj.","中等的；次要的"],
    ["section","n.","部分；章节"],
    ["secure","adj.","安全的 v. 获得"],
    ["segment","n.","段，部分"],
    ["seize","v.","抓住；夺取"],
    ["sensible","adj.","明智的，合理的"],
    ["sensitive","adj.","敏感的；灵敏的"],
    ["sequence","n.","顺序，序列"],
    ["series","n.","系列，连续"],
    ["shallow","adj.","浅的；肤浅的"],
    ["shelter","n.","避难所 v. 掩蔽"],
    ["shield","n.","盾 v. 保护"],
    ["shiver","v.","颤抖 n. 发抖"],
    ["shortage","n.","不足，缺少"],
    ["shrink","v.","收缩，退缩"],
    ["signal","n.","信号 v. 发信号"],
    ["sincere","adj.","诚挚的，真诚的"],
    ["singular","adj.","单数的；非凡的"],
    ["sketch","n.","素描 v. 概述"],
    ["slender","adj.","苗条的；微薄的"],
    ["slice","n.","薄片 v. 切片"],
    ["slight","adj.","轻微的，纤细的"],
    ["smart","adj.","聪明的；时髦的"],
    ["soak","v.","浸泡，渗透"],
    ["sole","adj.","唯一的；独有的"],
    ["solemn","adj.","庄严的，严肃的"],
    ["sophisticated","adj.","复杂的；精密的"],
    ["specify","v.","指定，详细说明"],
    ["speculate","v.","推测；投机"],
    ["splendid","adj.","辉煌的，极好的"],
    // ---- T ----
    ["talent","n.","天才，才能"],
    ["target","n.","目标 v. 瞄准"],
    ["technical","adj.","技术的，工艺的"],
    ["tedious","adj.","乏味的，冗长的"],
    ["temporary","adj.","临时的，暂时的"],
    ["tempt","v.","引诱，诱惑"],
    ["tend","v.","趋向；照料"],
    ["tender","adj.","温柔的；嫩的"],
    ["tense","adj.","紧张的 n. 时态"],
    ["terminal","n.","终点站；终端"],
    ["terrify","v.","使恐惧，使惊吓"],
    ["territory","n.","领土；领域"],
    ["textile","n.","纺织品 adj. 纺织的"],
    ["therefore","adv.","因此，所以"],
    ["thirst","n.","渴；渴望"],
    ["thorough","adj.","彻底的，完全的"],
    ["threat","n.","威胁，恐吓"],
    ["thrive","v.","兴旺，繁荣"],
    ["tolerate","v.","忍受，容忍"],
    ["trait","n.","特质，特性"],
    // ---- U ----
    ["ultimate","adj.","最终的，根本的"],
    ["uncover","v.","揭露，揭开"],
    ["undergo","v.","经历，承受"],
    ["undergraduate","n.","本科大学生"],
    ["undermine","v.","逐渐削弱"],
    ["undertake","v.","承担，从事"],
    ["uneasy","adj.","不安的，忧虑的"],
    ["unify","v.","统一，使一致"],
    ["universal","adj.","普遍的；宇宙的"],
    ["update","v.","更新 n. 升级"],
    // ---- V ----
    ["vacant","adj.","空的，未占用的"],
    ["vague","adj.","模糊的，含糊的"],
    ["vain","adj.","徒劳的；虚荣的"],
    ["valid","adj.","有效的；有根据的"],
    ["vanish","v.","消失，突然不见"],
    ["variable","adj.","可变的 n. 变量"],
    ["vast","adj.","广阔的，巨大的"],
    ["venture","n.","风险投资 v. 冒险"],
    ["verify","v.","核实，查证"],
    ["vessel","n.","船；容器；血管"],
    // ---- W ----
    ["wander","v.","漫游，走神"],
    ["warn","v.","警告，告诫"],
    ["weave","v.","编织，编造"],
    ["weird","adj.","奇怪的，怪异的"],
    ["whereas","conj.","然而，反之"],
    ["whisper","v.","低语 n. 耳语"],
    ["wholly","adv.","完全地，全部"],
    ["widespread","adj.","普遍的，广泛的"],
    ["wisdom","n.","智慧，才智"],
    ["witness","n.","目击者 v. 目睹"],
    // ---- Y / Z ----
    ["yield","v.","屈服；产出 n. 产量"],
    ["youthful","adj.","年轻的，朝气的"],
    ["zone","n.","地区，区域"],
    ["zoom","v.","缩放；急冲"]
  ];

  var WORD_BANK = RAW.map(function (r) {
    return { word: r[0], pos: r[1], meaning: r[2] };
  });

  // ---------- 艾宾浩斯复习调度（纯函数可单测——#28 验收原文） ----------
  var DAILY_NEW = 10;         // 每日新词上限
  var DAILY_REVIEW_CAP = 30;  // 每日复习上限（防积压雪崩）
  var INTERVALS = [1, 2, 4, 7, 15, 30]; // 艾宾浩斯间隔阶梯（天）
  var GRADES = ['know', 'fuzzy', 'unknown']; // 认识 / 模糊 / 不认识

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // 本地时区日键（v8.37 同款：getFullYear/getMonth/getDate，月份 0 起）
  function dayKeyOf(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function isDayKey(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  }

  // 日键加 n 天（本地 Date 构造规避 Date.parse 时区漂移；月份 0 起——v837 三连教训）
  function addDays(key, n) {
    var p = key.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function emptyProgress() { return { v: 1, words: {}, log: {} }; }

  // 进度规范化：损坏 JSON / 类型漂移 / 字段越界 → 静默降级（parseCache / reaction_stats_v1 同律）
  function normalizeProgress(raw) {
    var out = emptyProgress();
    if (raw == null) return out;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) { return out; }
    }
    if (typeof raw !== 'object' || !raw) return out;
    var words = (typeof raw.words === 'object' && raw.words) ? raw.words : {};
    Object.keys(words).forEach(function (w) {
      var e = words[w];
      if (!e || typeof e !== 'object' || typeof w !== 'string' || !w) return;
      if (!Number.isInteger(e.s) || e.s < 0 || e.s >= INTERVALS.length) return;
      if (e.due !== null && !isDayKey(e.due)) return;
      if (!Number.isInteger(e.seen) || e.seen < 0) return;
      out.words[w] = {
        s: e.s,
        due: isDayKey(e.due) ? e.due : null,
        seen: e.seen,
        born: isDayKey(e.born) ? e.born : null,
        last: isDayKey(e.last) ? e.last : null,
      };
    });
    var log = (typeof raw.log === 'object' && raw.log) ? raw.log : {};
    Object.keys(log).forEach(function (k) {
      var e = log[k];
      if (!isDayKey(k) || !e || typeof e !== 'object') return;
      var n = (Number.isInteger(e.n) && e.n > 0) ? e.n : 0;
      var r = (Number.isInteger(e.r) && e.r > 0) ? e.r : 0;
      if (n || r) out.log[k] = { n: n, r: r };
    });
    // log 只留最近 400 天（防无限膨胀；按键名排序=按日序）
    var keys = Object.keys(out.log).sort().slice(-400);
    var pruned = {};
    keys.forEach(function (k) { pruned[k] = out.log[k]; });
    out.log = pruned;
    return out;
  }

  // 今日队列：到期复习词（最逾期优先，封顶 30）+ 新词（补足每日 10）
  // 词序确定性：due 内 (due asc, word asc)，新词按词库序——同日重开队列稳定
  function buildQueue(bank, progress, todayKey) {
    var words = progress.words || {};
    var due = [];
    Object.keys(words).forEach(function (w) {
      var e = words[w];
      if (e && e.seen > 0 && e.due && e.due <= todayKey) due.push(w);
    });
    due.sort(function (a, b) {
      if (words[a].due !== words[b].due) return words[a].due < words[b].due ? -1 : 1;
      return a < b ? -1 : 1;
    });
    due = due.slice(0, DAILY_REVIEW_CAP);
    var bornToday = 0;
    Object.keys(words).forEach(function (w) {
      if (words[w].born === todayKey) bornToday++;
    });
    var fresh = [];
    for (var i = 0; i < bank.length && bornToday + fresh.length < DAILY_NEW; i++) {
      var w2 = bank[i].word;
      if (!words[w2]) fresh.push(w2);
    }
    return due.concat(fresh);
  }

  // 三键评分（#28 原文：认识 / 模糊 / 不认识）：
  //   认识   → 走艾宾浩斯阶梯（先按当前阶取间隔，再升阶封顶）
  //   模糊   → 明晨复检（间隔 1 天，阶不动）
  //   不认识 → 当日重现（阶归零，due=今日，重开即回队）
  // 非法 grade 防御降级为 fuzzy。
  function applyGrade(progress, word, grade, todayKey) {
    var g = GRADES.indexOf(grade) >= 0 ? grade : 'fuzzy';
    var e = progress.words[word];
    var isNew = false;
    if (!e) {
      e = progress.words[word] = { s: 0, due: todayKey, seen: 0, born: todayKey, last: todayKey };
      isNew = true;
    }
    e.seen++;
    e.last = todayKey;
    if (g === 'know') {
      e.due = addDays(todayKey, INTERVALS[e.s]);
      e.s = Math.min(e.s + 1, INTERVALS.length - 1);
    } else if (g === 'unknown') {
      e.s = 0;
      e.due = todayKey;
    } else {
      e.due = addDays(todayKey, 1);
    }
    var day = progress.log[todayKey] || (progress.log[todayKey] = { n: 0, r: 0 });
    if (isNew) day.n++; else day.r++;
    return progress;
  }

  function activityOn(log, key) {
    var d = log[key];
    return !!(d && ((d.n > 0) || (d.r > 0)));
  }

  // 统计：已学 / 待复习 / 已掌握（抵达 30 天档）/ 连续打卡 / 今日计数
  function statsOf(progress, todayKey) {
    var words = progress.words || {};
    var learned = 0, dueToday = 0, mastered = 0;
    Object.keys(words).forEach(function (w) {
      var e = words[w];
      if (e.seen > 0) {
        learned++;
        if (e.due && e.due <= todayKey) dueToday++;
        if (e.s >= INTERVALS.length - 1) mastered++;
      }
    });
    // 连续打卡：从今日起回溯；今日尚未学习则从昨日回溯（不断签）
    var streak = 0;
    var probe = activityOn(progress.log, todayKey) ? todayKey : addDays(todayKey, -1);
    while (activityOn(progress.log, probe) && streak < 400) {
      streak++;
      probe = addDays(probe, -1);
    }
    var today = progress.log[todayKey] || { n: 0, r: 0 };
    return {
      learned: learned,
      dueToday: dueToday,
      mastered: mastered,
      streak: streak,
      todayNew: today.n,
      todayReviews: today.r,
    };
  }

  window.__wordCore = {
    WORD_BANK: WORD_BANK,
    DAILY_NEW: DAILY_NEW,
    DAILY_REVIEW_CAP: DAILY_REVIEW_CAP,
    INTERVALS: INTERVALS,
    GRADES: GRADES,
    dayKeyOf: dayKeyOf,
    addDays: addDays,
    emptyProgress: emptyProgress,
    normalizeProgress: normalizeProgress,
    buildQueue: buildQueue,
    applyGrade: applyGrade,
    statsOf: statsOf,
  };
})();
