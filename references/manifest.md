# 小米手环 10 — 参考素材清单（Phase 1）

采集日期：2026-10-18
采样对象：Xiaomi Smart Band 10（标准版 / 陶瓷版 / 耀影金特别版）
本地存档目录：`references/img/`（文件名即下表 ID）
像素测量脚本：`references/measure.py` → `references/measurements.json`

来源代号：

| 代号 | 来源 | 说明 |
|---|---|---|
| **MI** | mi.com 全球产品页 | 官方渲染图（含 2560px 原图） |
| **T52** | 52audio《拆解报告：Xiaomi 小米手环 10 标准版》 | 实物拆解实拍，1199×800 |
| **TXF** | xfly01 转载同篇拆解（80P） | 实物图，640×427 |
| **QA** | qooah《Xiaomi Smart Band 10 評測》 | 实物实拍，1280×720 |
| **Spec** | mi.com 规格页 | 尺寸/重量/材质/配色文字参数 |

---

## 1. 视角覆盖表

| 部位 | 视角 | 来源 URL | 分辨率 | 备注（可见哪些细节） |
|---|---|---|---|---|
| 正面（R01） | 正对，亮屏 | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/healthfour.jpg | 877×739 | 白色 TPU 表带；黑边宽度、玻璃胶囊轮廓、四角圆度、屏幕 UI 布局；用于像素标定黑边占比 |
| 正面（R02） | 正对，亮屏（支架立置） | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/47dc88bc9f54cb8d449dc52092d70128.jpg | 877×739 | 表带从两端插入的夹角、机身下缘被表带包裹的高度 |
| 正面（R03） | 正对偏 5°，亮屏 | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/e8681ccd24e4ef8735503a0055f826b0.jpg | 2560×1365 | 玫瑰粉配色；粉色表带与银色中框的色差 |
| 正面熄屏（T04） | 正对，熄屏 | https://q4.itc.cn/images01/20250718/a5d6f27b8366498a9a2b58c3113b96cb.jpeg | 640×427 | 熄屏时 2.5D 玻璃呈整体镜面黑，可分辨玻璃边缘倒角与中框的分界线 |
| 正面熄屏（T06 镜像面） | 正对，熄屏 | 同 T52（背面图另一面） | 640×427 | 熄屏玻璃的镜面反射强度参考 |
| 背面（T06） | 正对，平铺 | https://q1.itc.cn/images01/20250718/dd90b6ce35034ba2a32b0f472e4204a6.jpeg | 640×427 | **主标定图**：机身平面轮廓、传感器模组三窗口、两枚充电触点、上下两个卡扣凹槽、"xiaomi" 丝印位置 |
| 背面（T02） | 正对（后盖内侧 + 整机背面） | https://52audio-images.oss-cn-shenzhen.aliyuncs.com/wp-content/uploads/2025/07/2025071810353054.jpg | 1199×800 | 后盖开窗形状、三窗口排布、两端卡扣凸耳位置 |
| 背面（T12） | 近景，含触点与快拆按钮 | https://52audio-images.oss-cn-shenzhen.aliyuncs.com/wp-content/uploads/2025/07/2025071810354132.jpg | 1199×800 | 高分辨率后盖实拍：三窗口模组、两触点、椭圆快拆按钮、底部卡扣凸耳的相对位置与比例 |
| 背面（Q01） | 近景，含触点 | https://qooah.com/wp-content/uploads/2025/06/XIAOMI_band10_13.webp | 1280×720 | 独立第二来源；磁吸凹槽、两触点相对位置、后盖磨砂质感 |
| 背面（Q02） | 45° 背面 | https://qooah.com/wp-content/uploads/2025/06/XIAOMI_band10_14.webp | 1280×721 | 传感器模组凸起高度、后盖弧度、表带与背面过渡 |
| 背面传感器微距（T07） | 微距 | https://q9.itc.cn/images01/20250718/78d3a7191ba3418ba0517dc343112ca3.jpeg | 640×427 | 三窗口形状差异（上下为白色 LED 窗、中间为灰色光电窗）、模组凸台轮廓、周边产品丝印环 |
| 背面触点微距（T08） | 微距 | https://q0.itc.cn/images01/20250718/a5a08431d64747f9883e7eafdfb71914.jpeg | 640×427 | 触点直径、镀金颜色、磁吸凹槽台阶、下方卡扣按钮轮廓 |
| 背面快拆按钮（T01） | 微距 | https://q5.itc.cn/images01/20250718/1e84e2a062ee4e928f9425eea63574a1.jpeg | 640×427 | 按钮为椭圆凸包 + 环状凹槽，位于背面近端部，居中 |
| 背面快拆按钮（T09） | 微距 | https://q5.itc.cn/images01/20250718/1e84e2a062ee4e928f9425eea63574a1.jpeg | 640×427 | 第二来源；按钮与 "xiaomi" 丝印的相对位置 |
| 左侧（T10） | 正侧（长边） | https://q8.itc.cn/images01/20250718/49644cf8f6d845bcabfb88caa01a1144.jpeg | 640×427 | 侧视厚度剖面：玻璃曲面→亮面切边→哑光中框→后盖；**无任何按键** |
| 右侧（T11） | 正侧（长边） | https://q2.itc.cn/images01/20250718/842a5a06c73446d198391e1c318f6a42.jpeg | 640×427 | 与左侧完全对称，确认无侧键、无开孔 |
| 左侧（T05） | 正侧 | https://q8.itc.cn/images01/20250718/49644cf8f6d845bcabfb88caa01a1144.jpeg | 640×427 | 侧视轮廓，可量取厚度分配比例 |
| 右侧（R04） | 正侧（渲染色） | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/2aa08ec966280c920d189caacf192d4c.jpg | 1799×1100 | 白色版右侧；表带 lug 与机身端部的包覆台阶 |
| 右侧（R05） | 正侧（渲染色） | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/319b2e5fc3c095ece062f84aae7770e4.jpg | 1799×1100 | 黑色版侧视：玻璃边缘 2.5D 弧面、中框亮边、表带包覆 |
| 右侧（R06） | 正侧（渲染色） | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/957611e4b287e23d24d778b767068cbd.jpg | 1799×1100 | 粉色版侧视，表带 lug 与机身的接缝走向 |
| 45°（R07） | 45° 俯视，熄屏 | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/4fd177e715659a73e877d716dd71dff8.jpg | 2560×1475 | 玻璃镜面反射、方形表盘之外的圆角过渡、整体厚薄感 |
| 45°（R08） | 45° 俯视，亮屏 | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/a5fa2fc6650c391d24a08064db83b882.jpg | 2560×862 | 银色金属链版本；中框拉丝/喷砂质感 |
| 45°（R09） | 45° 俯视，亮屏 | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/7aa3300958d3899348e604f1518ae0e4.jpg | 2560×1276 | 白色 TPU 版；屏幕高光位置 |
| 45°（R10） | 45° 俯视，亮屏 | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/a45ec0523e6fb90df63de5be7cc53704.jpg | 2560×1440 | 银色版；表带与机身的体量对比 |
| 屏幕/边框交界微距（R11） | 微距 30° | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/d922583f1f016fe2b194db61dcf71df2.jpg | 1700×577 | **关键**：2.5D 玻璃黑边宽度、玻璃边缘反射亮线、黑边外一圈金属切边、表带如何压住玻璃边角 |
| 屏幕微距（R12） | 微距 15° | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/c03ae7cb928256742366dbca65d8afc1.jpg | 549×528 | 玻璃弧面在屏幕内容上的高光形变，用于校准 IOR/粗糙度 |
| 屏幕/边框交界微距（Q04） | 近景正面 | https://qooah.com/wp-content/uploads/2025/06/XIAOMI_band10_03.webp | 1280×720 | 独立第二来源；黑边实测宽度感、UI 边缘与黑边分界 |
| 表带连接处（T03） | 爆炸图 | https://52audio-images.oss-cn-shenzhen.aliyuncs.com/wp-content/uploads/2025/07/2025071810353396.jpg | 1199×800 | **结构关键**：TPU 表带为一体式"环抱框"，中间开窗露出屏幕与背面，两端延伸为表带 |
| 表带连接处（Q03） | 近景 | https://qooah.com/wp-content/uploads/2025/06/XIAOMI_band10_19.webp | 1280×720 | 反扣式金属扣针、表带穿孔排布、扣合后的贴合状态 |
| 表带连接处（R11） | 微距 | 同 R11 | 1700×577 | 表带 lug 覆盖机身端部的高度与台阶 |

## 2. 配色覆盖

| 部位 | 视角 | 来源 URL | 分辨率 | 备注 |
|---|---|---|---|---|
| 全配色（R13） | 5 款并列 45° | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/Pcposter.jpg | 2560×1440 | 玫瑰粉 TPU / 棕色皮革+米兰尼斯 / 珍珠白陶瓷 / 不锈钢链 / 绿色水晶+米兰尼斯 |
| 全配色（R14） | 4 款并列正面 | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/specsbackground.jpg | 2560×907 | 黑 / 白 / 粉 / 白（陶瓷）四色正面同框，直接对比中框色 |
| 金属链（R15） | 45° | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/8547aeafc243d2b2ebabc1e5232674a3.jpg | 2560×1385 | 不锈钢链节尺寸、蝶形扣、与机身连接处的金属端头 |
| 金属链（R16） | 45° | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/9484fed3a2544e763d6b3bd00b9d7729.jpg | 2560×1400 | 粉色版金属链，链节高光走向 |
| 米兰尼斯（R17） | 45° | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/9b3a563720671222c89ea07f12b615d8.jpg | 2560×1497 | 编织网带纹理密度、磁吸扣、皮革过渡片 |
| 编织/针织（R18） | 45° | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/b3e8430efb4bcfe179c82c2e51b2e13a.jpg | 2560×1682 | 棕褐色编织表带：经纬纹理方向、厚度、端头包边 |
| 编织/针织（R20） | 佩戴 45° | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/9b152a8c1699c1ec1d06624c23aab2f6.png | 2560×1593 | 编织带弯折后的褶皱形态 |
| 水晶/珍珠链（R19） | 45° | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/bffb670d2ba8f55a3ba43f81a59a9f0e.png | 2560×1593 | 耀影金/水晶链的珠体反光、金属连接件 |
| 耀影金（R21） | 45° | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/da025c87518a3b3dc0e788257b681579.jpg | 2560×1460 | 金色中框的色相与粗糙度参考 |
| 表带形态（R22） | 45° 静物 | https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-smart-band-10/pc/fluoorbber.jpg | 2560×1900 | 官方资产名为 fluoorbber.jpg，实际画面为薄荷绿→淡紫渐变 TPU 表带：可见 12 个椭圆穿孔、末端收窄、金属扣针、表带横截面厚度；**不是**陶瓷版氟橡胶实拍，氟橡胶材质仅按 Spec 文字建模 |

## 3. 未找到可靠参考 / 需标注的项

| 项目 | 状态 | 处理方式 |
|---|---|---|
| 右侧实体按键 | **不存在** | 官方拆解明确"机身上无任何功能按键"（T10/T11 两视角互相印证）。任务书中的"按键"一项按事实记为无，不虚构按键。 |
| 表带内侧纹理微距 | 部分缺失 | 仅有 Q03 一张可辨穿孔与扣针，内侧防滑纹细节不足，模型中只做穿孔 + 平面，不添加臆测纹路。 |
| 氟橡胶表带实物 | 缺失 | 官方仅有渲染且未单列；按 Spec 文字建材质，不做表面纹理臆测。 |
| 陶瓷版实拍（非渲染） | 未找到 | 仅有官方渲染（R14/R22），陶瓷中框的实物质感按"高光、低粗糙度、微暖白"处理，并在材质注释中标注依据为渲染图。 |
| 耀影金特别版实拍 | 未找到 | 仅官方渲染 R19/R21。 |
| 屏幕熄屏时黑边与中框的精确分界 | 单来源 | 仅 R11 一张微距可分辨，已按该图比例建模，未做额外假设。 |
| 充电触点是否为 2 pin | 确认 | T06/T08 均显示 2 枚圆形触点，间距可测。 |

## 4. 尺寸与比例参考表

> 规则：每条数值标注来源。`Spec` = 官方规格页文字；`M-xx` = `references/measure.py` 的像素测量结果；`D` = 由 Spec 数据几何推导。

| # | 参数 | 数值 | 来源 | 说明 |
|---|---|---|---|---|
| D1 | 机身长 | 46.57 mm | Spec（mi.com 规格页） | 不含心率凸台 |
| D2 | 机身宽 | 22.54 mm | Spec | |
| D3 | 机身厚 | 10.95 mm | Spec | 含玻璃与后盖，不含传感器凸台 |
| D4 | 陶瓷版长×宽 | 47.74 × 23.94 mm | Spec | 陶瓷中框整体放大 |
| D5 | 主体重量 | 15.95 g（标准）/ 16.25 g（耀影金）/ 23.05 g（陶瓷） | Spec | |
| D6 | 屏幕对角线 | 1.72 in = 43.69 mm | Spec | AMOLED |
| D7 | 屏幕分辨率 | 212 × 520 px | Spec | 长宽比 2.4528 |
| D8 | 有效显示区 | 16.49 × 40.46 mm | D（1.72″ + 212:520 推导） | 与 D2 相减得黑边 |
| D9 | 玻璃黑区宽度 | 21.33 mm | M-R01 | 正面亮度剖面测得；黑区/机身宽 = 0.946 |
| D10 | 单边黑边宽 | 2.42 mm（测量）/ 2.0 mm（官方口径） | M-R01 / Spec（"边框宽度仅 2.0mm"） | 两者差 0.4 mm，取 2.2 mm 建模，误差在测量噪声内 |
| D11 | 正面金属框可见宽度 | 0.60 mm/边 | M-R01（22.54−21.33)/2 | 玻璃黑区外到机身轮廓 |
| D12 | 平面轮廓形状 | 超椭圆，指数 n = 2.79（RMSE 2.0 px ≈ 0.35 mm） | M-T06 | 非圆角矩形也非胶囊；用于生成机身平面轮廓 |
| D13 | 平面长宽比 | 2.085（实测）vs 2.066（官方） | M-T06 | 误差 0.93%，标定可信 |
| D14 | 传感器模组三窗口 | 3.15×2.45 @ y=−7.21；4.02×3.49 @ y=−2.84；4.02×3.32 @ y=+1.96（mm，相对机身中心，+ 向底端） | M-T06 | 中间为灰色光电窗，上下为白色 LED 窗 |
| D15 | 传感器凸台 | 约 11.0 × 18.5 mm，中心 y ≈ −2.5 mm，高出后盖约 0.5–0.7 mm | M-T06 + T07 目测 | 凸起量按 T07 侧向阴影估计，标注为估计值 |
| D16 | 充电触点 | Ø1.75 mm，中心 y = +11.75 mm，间距 3.66 mm（x = ±1.83） | M-T06 | 2 pin，镀金 |
| D17 | 快拆按钮 | 6.8 × 1.8 mm（±0.5），中心 y ≈ −22 mm | M-T06 目测 + T01 对照 | 椭圆凸包 + 环状凹槽 |
| D18 | 表带连接方式 | 一体式 TPU 环抱框 + 两端快拆卡扣；背面按钮释放 | T03 / T10 / Spec | 表带包住机身端部与长边的一部分，非端面对接 |
| D19 | 表带包覆高度 | 端部全包，长边包覆至距机身正面约 1.2 mm | R11 / R05 目测 | 用于确定 lug 台阶位置 |
| D20 | 厚度分配 | 玻璃弧面 2.2 mm / 中框 2.4 mm / 后盖 6.35 mm | T05 / T10 目测比例 × D3 | 侧视轮廓比例换算，误差 ±0.5 mm |
| D21 | 表带宽度 | 20.0 mm（端部 19.2 mm） | R15 / Q03 / R22 相对机身宽比例 | 与 22.54 mm 机身成 0.89 比例 |
| D22 | 表带厚度 | TPU 2.0 mm；皮革 2.4 mm；编织 2.6 mm；金属链 2.8 mm | R22 / R18 / R15 目测 | 仅用于体量，不作为精密尺寸；R22 横截面可读 TPU 约 2.0 mm |
| D23 | 腕围适配 | 135–210 mm（标准/陶瓷），135–180 mm（耀影金） | Spec | 决定表带展开长度与弯曲范围 |

## 5. 官方配色与表带材质

官方规格页（mi.com/global + mi.com/tw）文案：

| 配色 | 官方英文名 | 官方中文名 | 中框材质 | 标配表带 |
|---|---|---|---|---|
| 黑 | Midnight Black | 午夜黑 | 铝合金（哑光喷砂 + 亮面切边） | TPU |
| 银 | Glacier Silver | 冰川银 | 铝合金 | TPU |
| 粉 | Mystic Rose | 玫瑰粉 | 铝合金 | TPU |
| 白（陶瓷版） | Pearl White（Ceramic Edition） | 珍珠白 | 陶瓷 | 氟橡胶 |
| 金（特别版） | Glimmer Gold（Glimmer Edition） | 耀影金 | 铝合金 | 不锈钢 + 宝仕奥莎工艺水晶 |

可选表带（官方配件，快拆结构通用；来源：官方规格页 "六款全新快拆表带" + 媒体实拍 R13/R17/R18/R19 + pconline 评测文字）：

| 表带 | 材质 | 参考图 | 备注 |
|---|---|---|---|
| TPU | 热塑性聚氨酯 | R01 / R03 / R22 | 标准版标配，反扣式金属扣针，穿孔 12 个（R22 可数） |
| 氟橡胶 | Fluoro rubber | 无实拍（仅 Spec 文字） | 陶瓷版标配；材质按“哑光、低反光、无织物纹理”处理，无实物图佐证 |
| 不锈钢链 | 316L 不锈钢 | R15 / R16 | 链节 + 蝶形扣 |
| 米兰尼斯 | 不锈钢编织网 | R17 | 磁吸滑扣 + 皮革过渡片 |
| 编织 / 蚕丝针织 | 纺织纤维 | R18 / R20 | 经纬编织，端头包边 |
| 科纳皮磁吸 | 皮革 | R13（棕） | 磁吸扣，无穿孔 |
| 珍珠半链 | 金属 + 亚克力珠 | R19 | 吊坠形态，非腕带 |

> 说明：中国大陆版本另有「嫩芽绿」等中框配色与「釉下紫/铂金灰」陶瓷版本（百度百科条目提及），但未在 mi.com 全球/台湾规格页出现，未纳入本次建模配色，避免与官方主推配色混淆。

---

## 6. 与任务书字段的偏差说明（诚实记录）

1. 任务书要求"左侧、右侧（按键、表带连接处）"，但**小米手环 10 机身无实体按键**（T10、T11、Spec 三处一致）。已在模型中体现"无按键"，并在交互页面的相机预设中保留左右侧视角用于检查表带连接。
2. "各表带材质实物图"中，皮革/编织/金属链均有官方渲染 + 媒体佩戴实拍；陶瓷版与耀影金仅有官方渲染，无独立实拍来源，已在第 3 节标注。
