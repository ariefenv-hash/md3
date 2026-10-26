// ==================== lock-quotes.js — 锁屏一言·每日诗词（#26，v8.37） ====================
//
// 锁屏时钟下方的一言/诗词行：内置离线库按日确定性轮换（断网零依赖，超越 nightsky
// 断网空白的诗词签名），在线增强可选（v1.hitokoto.cn，设置 › 显示 › 锁定显示屏 开关，
// 默认关）。当日结果落 localStorage 缓存复用；跨午夜由 lock-screen refreshClock 驱动切换。
//
// 结构纪律（可测性，#29 __rxCore 同款模式）：
//   · 顶层零副作用——不碰 document/localStorage/window，node 直接 import 安全
//   · __quoteCore 导出纯函数（dayKeyOf/pickIndex/parseCache），vitest 沙箱直接驱动
//   · mountLockQuote(lockEl) 唯一 DOM 出口，由 lock-screen.js ensureLockDOM 调用

/** 离线诗词库：108 条唐诗/宋词名句（t=正文 a=作者 s=出处），短句优先适配锁屏排版 */
export const POEMS = [
  { t: '举头望明月，低头思故乡。', a: '李白', s: '静夜思' },
  { t: '海上生明月，天涯共此时。', a: '张九龄', s: '望月怀远' },
  { t: '欲穷千里目，更上一层楼。', a: '王之涣', s: '登鹳雀楼' },
  { t: '白日依山尽，黄河入海流。', a: '王之涣', s: '登鹳雀楼' },
  { t: '黄河远上白云间，一片孤城万仞山。', a: '王之涣', s: '凉州词' },
  { t: '春眠不觉晓，处处闻啼鸟。', a: '孟浩然', s: '春晓' },
  { t: '夜来风雨声，花落知多少。', a: '孟浩然', s: '春晓' },
  { t: '野旷天低树，江清月近人。', a: '孟浩然', s: '宿建德江' },
  { t: '绿树村边合，青山郭外斜。', a: '孟浩然', s: '过故人庄' },
  { t: '气蒸云梦泽，波撼岳阳城。', a: '孟浩然', s: '望洞庭湖赠张丞相' },
  { t: '谁知盘中餐，粒粒皆辛苦。', a: '李绅', s: '悯农' },
  { t: '锄禾日当午，汗滴禾下土。', a: '李绅', s: '悯农' },
  { t: '野火烧不尽，春风吹又生。', a: '白居易', s: '赋得古原草送别' },
  { t: '在天愿作比翼鸟，在地愿为连理枝。', a: '白居易', s: '长恨歌' },
  { t: '同是天涯沦落人，相逢何必曾相识。', a: '白居易', s: '琵琶行' },
  { t: '日出江花红胜火，春来江水绿如蓝。', a: '白居易', s: '忆江南' },
  { t: '一道残阳铺水中，半江瑟瑟半江红。', a: '白居易', s: '暮江吟' },
  { t: '可怜九月初三夜，露似真珠月似弓。', a: '白居易', s: '暮江吟' },
  { t: '人间四月芳菲尽，山寺桃花始盛开。', a: '白居易', s: '大林寺桃花' },
  { t: '几处早莺争暖树，谁家新燕啄春泥。', a: '白居易', s: '钱塘湖春行' },
  { t: '乱花渐欲迷人眼，浅草才能没马蹄。', a: '白居易', s: '钱塘湖春行' },
  { t: '独在异乡为异客，每逢佳节倍思亲。', a: '王维', s: '九月九日忆山东兄弟' },
  { t: '遥知兄弟登高处，遍插茱萸少一人。', a: '王维', s: '九月九日忆山东兄弟' },
  { t: '红豆生南国，春来发几枝。', a: '王维', s: '相思' },
  { t: '愿君多采撷，此物最相思。', a: '王维', s: '相思' },
  { t: '空山不见人，但闻人语响。', a: '王维', s: '鹿柴' },
  { t: '明月松间照，清泉石上流。', a: '王维', s: '山居秋暝' },
  { t: '大漠孤烟直，长河落日圆。', a: '王维', s: '使至塞上' },
  { t: '劝君更尽一杯酒，西出阳关无故人。', a: '王维', s: '送元二使安西' },
  { t: '独坐幽篁里，弹琴复长啸。', a: '王维', s: '竹里馆' },
  { t: '葡萄美酒夜光杯，欲饮琵琶马上催。', a: '王翰', s: '凉州词' },
  { t: '醉卧沙场君莫笑，古来征战几人回。', a: '王翰', s: '凉州词' },
  { t: '秦时明月汉时关，万里长征人未还。', a: '王昌龄', s: '出塞' },
  { t: '但使龙城飞将在，不教胡马度阴山。', a: '王昌龄', s: '出塞' },
  { t: '洛阳亲友如相问，一片冰心在玉壶。', a: '王昌龄', s: '芙蓉楼送辛渐' },
  { t: '黄沙百战穿金甲，不破楼兰终不还。', a: '王昌龄', s: '从军行' },
  { t: '青海长云暗雪山，孤城遥望玉门关。', a: '王昌龄', s: '从军行' },
  { t: '忽如一夜春风来，千树万树梨花开。', a: '岑参', s: '白雪歌送武判官归京' },
  { t: '山回路转不见君，雪上空留马行处。', a: '岑参', s: '白雪歌送武判官归京' },
  { t: '北风卷地白草折，胡天八月即飞雪。', a: '岑参', s: '白雪歌送武判官归京' },
  { t: '孤帆远影碧空尽，唯见长江天际流。', a: '李白', s: '黄鹤楼送孟浩然之广陵' },
  { t: '飞流直下三千尺，疑是银河落九天。', a: '李白', s: '望庐山瀑布' },
  { t: '两岸猿声啼不住，轻舟已过万重山。', a: '李白', s: '早发白帝城' },
  { t: '朝辞白帝彩云间，千里江陵一日还。', a: '李白', s: '早发白帝城' },
  { t: '桃花潭水深千尺，不及汪伦送我情。', a: '李白', s: '赠汪伦' },
  { t: '天生我材必有用，千金散尽还复来。', a: '李白', s: '将进酒' },
  { t: '长风破浪会有时，直挂云帆济沧海。', a: '李白', s: '行路难' },
  { t: '停杯投箸不能食，拔剑四顾心茫然。', a: '李白', s: '行路难' },
  { t: '抽刀断水水更流，举杯消愁愁更愁。', a: '李白', s: '宣州谢朓楼饯别校书叔云' },
  { t: '长风万里送秋雁，对此可以酣高楼。', a: '李白', s: '宣州谢朓楼饯别校书叔云' },
  { t: '我寄愁心与明月，随君直到夜郎西。', a: '李白', s: '闻王昌龄左迁龙标遥有此寄' },
  { t: '举杯邀明月，对影成三人。', a: '李白', s: '月下独酌' },
  { t: '长安一片月，万户捣衣声。', a: '李白', s: '子夜吴歌' },
  { t: '云想衣裳花想容，春风拂槛露华浓。', a: '李白', s: '清平调' },
  { t: '今人不见古时月，今月曾经照古人。', a: '李白', s: '把酒问月' },
  { t: '危楼高百尺，手可摘星辰。', a: '李白', s: '夜宿山寺' },
  { t: '小时不识月，呼作白玉盘。', a: '李白', s: '古朗月行' },
  { t: '天门中断楚江开，碧水东流至此回。', a: '李白', s: '望天门山' },
  { t: '两岸青山相对出，孤帆一片日边来。', a: '李白', s: '望天门山' },
  { t: '峨眉山月半轮秋，影入平羌江水流。', a: '李白', s: '峨眉山月歌' },
  { t: '此夜曲中闻折柳，何人不起故园情。', a: '李白', s: '春夜洛城闻笛' },
  { t: '日照香炉生紫烟，遥看瀑布挂前川。', a: '李白', s: '望庐山瀑布' },
  { t: '会当凌绝顶，一览众山小。', a: '杜甫', s: '望岳' },
  { t: '随风潜入夜，润物细无声。', a: '杜甫', s: '春夜喜雨' },
  { t: '好雨知时节，当春乃发生。', a: '杜甫', s: '春夜喜雨' },
  { t: '感时花溅泪，恨别鸟惊心。', a: '杜甫', s: '春望' },
  { t: '露从今夜白，月是故乡明。', a: '杜甫', s: '月夜忆舍弟' },
  { t: '无边落木萧萧下，不尽长江滚滚来。', a: '杜甫', s: '登高' },
  { t: '星垂平野阔，月涌大江流。', a: '杜甫', s: '旅夜书怀' },
  { t: '两个黄鹂鸣翠柳，一行白鹭上青天。', a: '杜甫', s: '绝句' },
  { t: '窗含西岭千秋雪，门泊东吴万里船。', a: '杜甫', s: '绝句' },
  { t: '迟日江山丽，春风花草香。', a: '杜甫', s: '绝句二首' },
  { t: '正是江南好风景，落花时节又逢君。', a: '杜甫', s: '江南逢李龟年' },
  { t: '却看妻子愁何在，漫卷诗书喜欲狂。', a: '杜甫', s: '闻官军收河南河北' },
  { t: '白日放歌须纵酒，青春作伴好还乡。', a: '杜甫', s: '闻官军收河南河北' },
  { t: '冠盖满京华，斯人独憔悴。', a: '杜甫', s: '梦李白二首' },
  { t: '停车坐爱枫林晚，霜叶红于二月花。', a: '杜牧', s: '山行' },
  { t: '千里莺啼绿映红，水村山郭酒旗风。', a: '杜牧', s: '江南春' },
  { t: '南朝四百八十寺，多少楼台烟雨中。', a: '杜牧', s: '江南春' },
  { t: '东风不与周郎便，铜雀春深锁二乔。', a: '杜牧', s: '赤壁' },
  { t: '商女不知亡国恨，隔江犹唱后庭花。', a: '杜牧', s: '泊秦淮' },
  { t: '二十四桥明月夜，玉人何处教吹箫。', a: '杜牧', s: '寄扬州韩绰判官' },
  { t: '借问酒家何处有，牧童遥指杏花村。', a: '杜牧', s: '清明' },
  { t: '清明时节雨纷纷，路上行人欲断魂。', a: '杜牧', s: '清明' },
  { t: '天阶夜色凉如水，卧看牵牛织女星。', a: '杜牧', s: '秋夕' },
  { t: '银烛秋光冷画屏，轻罗小扇扑流萤。', a: '杜牧', s: '秋夕' },
  { t: '春风十里扬州路，卷上珠帘总不如。', a: '杜牧', s: '赠别' },
  { t: '蜡烛有心还惜别，替人垂泪到天明。', a: '杜牧', s: '赠别' },
  { t: '夕阳无限好，只是近黄昏。', a: '李商隐', s: '登乐游原' },
  { t: '春蚕到死丝方尽，蜡炬成灰泪始干。', a: '李商隐', s: '无题' },
  { t: '身无彩凤双飞翼，心有灵犀一点通。', a: '李商隐', s: '无题' },
  { t: '何当共剪西窗烛，却话巴山夜雨时。', a: '李商隐', s: '夜雨寄北' },
  { t: '沧海月明珠有泪，蓝田日暖玉生烟。', a: '李商隐', s: '锦瑟' },
  { t: '嫦娥应悔偷灵药，碧海青天夜夜心。', a: '李商隐', s: '嫦娥' },
  { t: '沉舟侧畔千帆过，病树前头万木春。', a: '刘禹锡', s: '酬乐天扬州初逢席上见赠' },
  { t: '晴空一鹤排云上，便引诗情到碧霄。', a: '刘禹锡', s: '秋词' },
  { t: '旧时王谢堂前燕，飞入寻常百姓家。', a: '刘禹锡', s: '乌衣巷' },
  { t: '东边日出西边雨，道是无晴却有晴。', a: '刘禹锡', s: '竹枝词二首' },
  { t: '千山鸟飞绝，万径人踪灭。', a: '柳宗元', s: '江雪' },
  { t: '孤舟蓑笠翁，独钓寒江雪。', a: '柳宗元', s: '江雪' },
  { t: '月落乌啼霜满天，江枫渔火对愁眠。', a: '张继', s: '枫桥夜泊' },
  { t: '姑苏城外寒山寺，夜半钟声到客船。', a: '张继', s: '枫桥夜泊' },
  { t: '春潮带雨晚来急，野渡无人舟自横。', a: '韦应物', s: '滁州西涧' },
  { t: '柴门闻犬吠，风雪夜归人。', a: '刘长卿', s: '逢雪宿芙蓉山主人' },
  { t: '曲径通幽处，禅房花木深。', a: '常建', s: '题破山寺后禅院' },
  { t: '海内存知己，天涯若比邻。', a: '王勃', s: '送杜少府之任蜀州' },
  { t: '落霞与孤鹜齐飞，秋水共长天一色。', a: '王勃', s: '滕王阁序' },
  { t: '前不见古人，后不见来者。', a: '陈子昂', s: '登幽州台歌' },
  { t: '念天地之悠悠，独怆然而涕下。', a: '陈子昂', s: '登幽州台歌' },
  { t: '谁言寸草心，报得三春晖。', a: '孟郊', s: '游子吟' },
  { t: '春江潮水连海平，海上明月共潮生。', a: '张若虚', s: '春江花月夜' },
  { t: '天街小雨润如酥，草色遥看近却无。', a: '韩愈', s: '早春呈水部张十八员外' },
  { t: '曾经沧海难为水，除却巫山不是云。', a: '元稹', s: '离思五首' },
  { t: '鸟宿池边树，僧敲月下门。', a: '贾岛', s: '题李凝幽居' },
  { t: '十年磨一剑，霜刃未曾试。', a: '贾岛', s: '剑客' },
];

/** 宋词与宋代诗（t 同上） */
const SONG_POEMS = [
  { t: '明月几时有，把酒问青天。', a: '苏轼', s: '水调歌头' },
  { t: '但愿人长久，千里共婵娟。', a: '苏轼', s: '水调歌头' },
  { t: '人有悲欢离合，月有阴晴圆缺。', a: '苏轼', s: '水调歌头' },
  { t: '大江东去，浪淘尽，千古风流人物。', a: '苏轼', s: '念奴娇·赤壁怀古' },
  { t: '竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。', a: '苏轼', s: '定风波' },
  { t: '回首向来萧瑟处，归去，也无风雨也无晴。', a: '苏轼', s: '定风波' },
  { t: '十年生死两茫茫，不思量，自难忘。', a: '苏轼', s: '江城子' },
  { t: '会挽雕弓如满月，西北望，射天狼。', a: '苏轼', s: '江城子·密州出猎' },
  { t: '欲把西湖比西子，淡妆浓抹总相宜。', a: '苏轼', s: '饮湖上初晴后雨' },
  { t: '水光潋滟晴方好，山色空蒙雨亦奇。', a: '苏轼', s: '饮湖上初晴后雨' },
  { t: '不识庐山真面目，只缘身在此山中。', a: '苏轼', s: '题西林壁' },
  { t: '竹外桃花三两枝，春江水暖鸭先知。', a: '苏轼', s: '惠崇春江晚景' },
  { t: '蒌蒿满地芦芽短，正是河豚欲上时。', a: '苏轼', s: '惠崇春江晚景' },
  { t: '一年好景君须记，最是橙黄橘绿时。', a: '苏轼', s: '赠刘景文' },
  { t: '荷尽已无擎雨盖，菊残犹有傲霜枝。', a: '苏轼', s: '赠刘景文' },
  { t: '黑云翻墨未遮山，白雨跳珠乱入船。', a: '苏轼', s: '六月二十七日望湖楼醉书' },
  { t: '春宵一刻值千金，花有清香月有阴。', a: '苏轼', s: '春宵' },
  { t: '墙角数枝梅，凌寒独自开。', a: '王安石', s: '梅花' },
  { t: '春风又绿江南岸，明月何时照我还。', a: '王安石', s: '泊船瓜洲' },
  { t: '采菊东篱下，悠然见南山。', a: '陶渊明', s: '饮酒·其五' },
  { t: '山重水复疑无路，柳暗花明又一村。', a: '陆游', s: '游山西村' },
  { t: '纸上得来终觉浅，绝知此事要躬行。', a: '陆游', s: '冬夜读书示子聿' },
  { t: '王师北定中原日，家祭无忘告乃翁。', a: '陆游', s: '示儿' },
  { t: '小楼一夜听春雨，深巷明朝卖杏花。', a: '陆游', s: '临安春雨初霁' },
  { t: '楼船夜雪瓜洲渡，铁马秋风大散关。', a: '陆游', s: '书愤' },
  { t: '无意苦争春，一任群芳妒。', a: '陆游', s: '卜算子·咏梅' },
  { t: '零落成泥碾作尘，只有香如故。', a: '陆游', s: '卜算子·咏梅' },
  { t: '春色满园关不住，一枝红杏出墙来。', a: '叶绍翁', s: '游园不值' },
  { t: '等闲识得东风面，万紫千红总是春。', a: '朱熹', s: '春日' },
  { t: '问渠那得清如许？为有源头活水来。', a: '朱熹', s: '观书有感' },
  { t: '生当作人杰，死亦为鬼雄。', a: '李清照', s: '夏日绝句' },
  { t: '小荷才露尖尖角，早有蜻蜓立上头。', a: '杨万里', s: '小池' },
  { t: '接天莲叶无穷碧，映日荷花别样红。', a: '杨万里', s: '晓出净慈寺送林子方' },
  { t: '梅须逊雪三分白，雪却输梅一段香。', a: '卢梅坡', s: '雪梅' },
  { t: '草长莺飞二月天，拂堤杨柳醉春烟。', a: '高鼎', s: '村居' },
  { t: '儿童散学归来早，忙趁东风放纸鸢。', a: '高鼎', s: '村居' },
  { t: '寻寻觅觅，冷冷清清，凄凄惨惨戚戚。', a: '李清照', s: '声声慢' },
  { t: '莫道不销魂，帘卷西风，人比黄花瘦。', a: '李清照', s: '醉花阴' },
  { t: '知否，知否？应是绿肥红瘦。', a: '李清照', s: '如梦令' },
  { t: '常记溪亭日暮，沉醉不知归路。', a: '李清照', s: '如梦令' },
  { t: '此情无计可消除，才下眉头，却上心头。', a: '李清照', s: '一剪梅' },
  { t: '花自飘零水自流，一种相思，两处闲愁。', a: '李清照', s: '一剪梅' },
  { t: '云中谁寄锦书来？雁字回时，月满西楼。', a: '李清照', s: '一剪梅' },
  { t: '物是人非事事休，欲语泪先流。', a: '李清照', s: '武陵春' },
  { t: '只恐双溪舴艋舟，载不动许多愁。', a: '李清照', s: '武陵春' },
  { t: '东篱把酒黄昏后，有暗香盈袖。', a: '李清照', s: '醉花阴' },
  { t: '众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。', a: '辛弃疾', s: '青玉案·元夕' },
  { t: '醉里挑灯看剑，梦回吹角连营。', a: '辛弃疾', s: '破阵子' },
  { t: '了却君王天下事，赢得生前身后名。', a: '辛弃疾', s: '破阵子' },
  { t: '千古兴亡多少事？悠悠。不尽长江滚滚流。', a: '辛弃疾', s: '南乡子' },
  { t: '少年不识愁滋味，爱上层楼。', a: '辛弃疾', s: '丑奴儿' },
  { t: '郁孤台下清江水，中间多少行人泪。', a: '辛弃疾', s: '菩萨蛮·书江西造口壁' },
  { t: '无可奈何花落去，似曾相识燕归来。', a: '晏殊', s: '浣溪沙' },
  { t: '昨夜西风凋碧树，独上高楼，望尽天涯路。', a: '晏殊', s: '蝶恋花' },
  { t: '满目山河空念远，落花风雨更伤春。', a: '晏殊', s: '浣溪沙' },
  { t: '泪眼问花花不语，乱红飞过秋千去。', a: '欧阳修', s: '蝶恋花' },
  { t: '月上柳梢头，人约黄昏后。', a: '欧阳修', s: '生查子·元夕' },
  { t: '平芜尽处是春山，行人更在春山外。', a: '欧阳修', s: '踏莎行' },
  { t: '衣带渐宽终不悔，为伊消得人憔悴。', a: '柳永', s: '蝶恋花' },
  { t: '多情自古伤离别，更那堪冷落清秋节。', a: '柳永', s: '雨霖铃' },
  { t: '今宵酒醒何处？杨柳岸，晓风残月。', a: '柳永', s: '雨霖铃' },
  { t: '执手相看泪眼，竟无语凝噎。', a: '柳永', s: '雨霖铃' },
  { t: '两情若是久长时，又岂在朝朝暮暮。', a: '秦观', s: '鹊桥仙' },
  { t: '金风玉露一相逢，便胜却人间无数。', a: '秦观', s: '鹊桥仙' },
  { t: '自在飞花轻似梦，无边丝雨细如愁。', a: '秦观', s: '浣溪沙' },
  { t: '山抹微云，天连衰草，画角声断谯门。', a: '秦观', s: '满庭芳' },
  { t: '试问闲愁都几许？一川烟草，满城风絮，梅子黄时雨。', a: '贺铸', s: '青玉案' },
  { t: '碧云天，黄叶地，秋色连波，波上寒烟翠。', a: '范仲淹', s: '苏幕遮' },
  { t: '山映斜阳天接水，芳草无情，更在斜阳外。', a: '范仲淹', s: '苏幕遮' },
  { t: '塞下秋来风景异，衡阳雁去无留意。', a: '范仲淹', s: '渔家傲·秋思' },
  { t: '浊酒一杯家万里，燕然未勒归无计。', a: '范仲淹', s: '渔家傲·秋思' },
  { t: '羌管悠悠霜满地，人不寐，将军白发征夫泪。', a: '范仲淹', s: '渔家傲·秋思' },
  { t: '夕阳西下，断肠人在天涯。', a: '马致远', s: '天净沙·秋思' },
  { t: '枯藤老树昏鸦，小桥流水人家。', a: '马致远', s: '天净沙·秋思' },
];

/** 合并全库（唐前半 + 唐后半 + 宋；顺序稳定保证轮换索引跨版本可预期） */
export const ALL_QUOTES = POEMS.concat(SONG_POEMS);

// ==================== 纯函数核心（vitest 沙箱直驱） ====================

/**
 * 本地时区日键 'YYYY-MM-DD'（轮换与缓存共用的当日标识；
 * Date 注入而非内部取 new Date()，测试零时钟依赖）
 */
export function dayKeyOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 按日确定性轮换：dayKey 字符串多项式 hash → 索引。
 * 同日恒同条（当日多次渲染幂等），跨日切换且全库覆盖（hash 质量由测试守护）。
 */
export function pickIndex(list, dayKey) {
  let h = 0;
  for (let i = 0; i < dayKey.length; i++) h = (h * 31 + dayKey.charCodeAt(i)) >>> 0;
  return h % list.length;
}

/** dayKey → 条目（pickIndex 的便捷出口） */
export function pickByDate(list, dayKey) {
  return list[pickIndex(list, dayKey)];
}

/**
 * 缓存解析：当日命中返回 {t,a,s,src}，跨日/损坏 JSON/缺字段一律 null（静默降级，
 * reaction_stats_v1 损坏 JSON 静默降级同律——锁屏绝不能因脏缓存白屏或抛错）。
 */
export function parseCache(raw, todayKey) {
  if (!raw || typeof raw !== 'string') return null;
  let o;
  try {
    o = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  if (!o || typeof o !== 'object' || o.day !== todayKey) return null;
  const q = o.q;
  if (!q || typeof q !== 'object') return null;
  if (typeof q.t !== 'string' || !q.t) return null;
  return {
    t: q.t,
    a: typeof q.a === 'string' && q.a ? q.a : '佚名',
    s: typeof q.s === 'string' && q.s ? q.s : '一言',
    src: q.src === 'online' ? 'online' : 'offline',
  };
}

// 测试沙箱出口（__rxCore 同款命名惯例）
export const __quoteCore = { dayKeyOf, pickIndex, pickByDate, parseCache };

// ==================== DOM 挂载（唯一 DOM 出口） ====================

const CACHE_KEY = 'ios-desktop:lock-quote-cache';      // {day,q,src}，当日复用
const ONLINE_KEY = 'ios-desktop:lock-quote-online';    // '1' 开（设置页开关写入）/ 缺省关
const HITOKOTO_URL = 'https://v1.hitokoto.cn/?c=d&c=e&max_length=42'; // d=诗词 e=文学（议题「按句子类型过滤」）
const FETCH_TIMEOUT = 4500;

let quoteEl = null;
let renderedDayKey = null;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function readStore(key) {
  try {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem(key) || '';
  } catch (e) {
    return '';
  }
}

function writeStore(key, val) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, val);
  } catch (e) { /* 配额满/隐私模式静默 */ }
}

function onlineEnabled() {
  return readStore(ONLINE_KEY) === '1';
}

/** 渲染一条：正文 + 作者出处小字（esc 全链防注入——锁屏内容可能来自在线 API） */
function renderQuote(q) {
  if (!quoteEl) return;
  quoteEl.innerHTML = `<div class="lock-quote-text">${esc(q.t)}</div>` +
    `<div class="lock-quote-src">——${esc(q.a)}《${esc(q.s)}》</div>`;
}

/**
 * 拉取一言（在线增强）：c=d&c=e 诗词+文学，max_length=42 防超长破坏排版。
 * 任何失败（断网/超时/HTTP 非 2xx/字段缺失）都 throw，由调用方静默回落离线条——
 * 「断网可用」是第一验收，在线增强永远只是锦上添花。
 */
function fetchHitokoto() {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => { try { if (ctl) ctl.abort(); } catch (e) {} }, FETCH_TIMEOUT);
  return fetch(HITOKOTO_URL, ctl ? { signal: ctl.signal } : undefined)
    .then((r) => {
      if (!r.ok) throw new Error(`http ${r.status}`);
      return r.json();
    })
    .then((d) => {
      const t = d && typeof d.hitokoto === 'string' ? d.hitokoto : '';
      if (!t) throw new Error('empty hitokoto');
      return {
        t,
        a: d.from_who && typeof d.from_who === 'string' ? d.from_who : '佚名',
        s: d.from && typeof d.from === 'string' ? d.from : '一言',
        src: 'online',
      };
    })
    .finally(() => clearTimeout(timer));
}

/** 当日渲染主流程：缓存当日命中即用 → 否则离线确定性条立即显示 → 开关开再尝试在线增强 */
function renderToday() {
  const todayKey = dayKeyOf(new Date());
  renderedDayKey = todayKey;

  const cached = parseCache(readStore(CACHE_KEY), todayKey);
  if (cached) {
    renderQuote(cached);
  } else {
    const offline = pickByDate(ALL_QUOTES, todayKey);
    renderQuote(offline);
    writeStore(CACHE_KEY, JSON.stringify({ day: todayKey, q: offline, src: 'offline' }));
  }

  if (onlineEnabled()) {
    fetchHitokoto()
      .then((q) => {
        // 拉取期间可能已跨日/重挂载：落到缓存再渲染，渲染前校验仍是当日
        if (renderedDayKey !== dayKeyOf(new Date())) return;
        writeStore(CACHE_KEY, JSON.stringify({ day: dayKeyOf(new Date()), q, src: 'online' }));
        renderQuote(q);
      })
      .catch(() => {
        // 断网/超时：若当日无缓存在场（缓存被清/首次开开关），离线条兜底绝不空窗陈旧
        const todayKey = dayKeyOf(new Date());
        if (renderedDayKey === todayKey && !parseCache(readStore(CACHE_KEY), todayKey)) {
          renderQuote(pickByDate(ALL_QUOTES, todayKey));
          writeStore(CACHE_KEY, JSON.stringify({ day: todayKey, q: pickByDate(ALL_QUOTES, todayKey), src: 'offline' }));
        }
      });
  }
}

/**
 * 挂载锁屏一言（lock-screen.js ensureLockDOM 调用；lockEl 仅用于定位容器与事件）
 * 在线开关切换广播（lock-quote-online-changed）即时重渲染：开 → 立即尝试在线；
 * 关 → 回落当日离线条（在线缓存当日仍命中则先显示缓存，次日自然回离线轮换）。
 */
export function mountLockQuote(lockEl) {
  if (!lockEl) return;
  quoteEl = lockEl.querySelector('.lock-quote');
  if (!quoteEl) return;
  renderToday();

  document.addEventListener('lock-quote-online-changed', () => {
    if (!quoteEl) return;
    const todayKey = dayKeyOf(new Date());
    renderedDayKey = todayKey;
    const cached = parseCache(readStore(CACHE_KEY), todayKey);
    if (onlineEnabled()) {
      fetchHitokoto()
        .then((q) => {
          if (renderedDayKey !== dayKeyOf(new Date())) return;
          writeStore(CACHE_KEY, JSON.stringify({ day: dayKeyOf(new Date()), q, src: 'online' }));
          renderQuote(q);
        })
        .catch(() => {
          // 断网/超时：当日无缓存在场 → 离线条兜底（绝白屏/绝陈旧，v837 e2e-E 抓真语义）
          const todayKey = dayKeyOf(new Date());
          if (!parseCache(readStore(CACHE_KEY), todayKey)) {
            const offline = pickByDate(ALL_QUOTES, todayKey);
            renderQuote(offline);
            writeStore(CACHE_KEY, JSON.stringify({ day: todayKey, q: offline, src: 'offline' }));
          }
        });
    } else if (cached && cached.src === 'online') {
      renderQuote(cached); // 当日在线结果仍可复用（议题：当日复用）
    } else {
      renderQuote(pickByDate(ALL_QUOTES, todayKey));
    }
  });
}

/**
 * 跨午夜切换（lock-screen.js refreshClock 10s tick 驱动）：
 * 日键变化即重走当日流程（在线缓存新一日未命中 → 离线新条立即显示）。
 */
export function refreshLockQuoteDay() {
  if (!quoteEl) return;
  const todayKey = dayKeyOf(new Date());
  if (todayKey === renderedDayKey) return;
  renderToday();
}
