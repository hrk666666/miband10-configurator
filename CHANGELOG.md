# CHANGELOG —— 自动检测与迭代修正记录

每轮格式：`[轮次 N] 问题=xxx 修改=xxx 验证=xxx`。
截图证据：`snapshots/round-1/`、`snapshots/round-2/`（各 5 配色 × 5 表带 × 7 机位 = 175 张，900×900）。
自动判定：`python3 tools/analyze.py snapshots/round-N` → `analysis.json`。

---

## [建模阶段] 结构性问题（进入自动检测之前）

这些问题靠单张截图即可发现，先修掉再跑矩阵。

| # | 问题 | 修改 | 验证 |
|---|---|---|---|
| B1 | 表带炸成碎片：设置 `rotation.y = 0` 覆盖了骨骼静止朝向 | 缓存静止四元数，改为 `rest * delta` | 表带恢复完整 |
| B2 | 蒙皮网格在带旋转的父节点下，glTF 规定该变换被忽略，表带留在设备坐标系 | 顶点导出前烘焙 Rz(90)，关节世界矩阵同样含 Rz(90)，IBM 取其逆 | 表带与机身对齐 |
| B3 | 圆角矩形轮廓角点顺序错误，屏幕/玻璃出现穿过中心的直线切面（"吃豆人"） | 重写 `roundedRectOutline` 四角起始角（0/90/180/270） | 切面消失 |
| B4 | 玻璃黑边用射线求交算极坐标半径，公式错导致轮廓被捏成蛋形 | 改用正确的射线-线段求交（叉积推导 t、u） | 轮廓恢复超椭圆 |
| B5 | 屏幕贴图镜像且旋转 90° | UV 改为 u←设备宽度、v←设备长度，翻转 u | 文字正向、不镜像 |
| B6 | 表带与机身零间距对接，无包裹结构 | 表带起始截面直接由机身同一套超椭圆/后盖样条算出并留 1.5 mm 间隙，22% 行程内过渡到扁平表带 | 接缝处有包覆唇边 |
| B7 | 表带孔洞过大过密，侧视呈"拉链" | 4.6 × 2.7 mm、12 孔、间距 3.9 mm | 见 round-2 lug 特写 |
| B8 | 表带纹理沿长度被拉伸 10 倍 | UV 改毫米尺度（13 mm 一循环） | 编织/皮革纹理不再条纹化 |
| B9 | 骨骼开合时表带自交 | 闭合限位 0.95°/骨、张开 1.9°/骨；镜像半侧旋转取反 | `tools/selfintersect.mjs` 10/10 PASS |

---

## [轮次 1] 首轮全矩阵检测

采集：`tools/shoot.mjs --round 1`（175 张）。
判定：`tools/analyze.py snapshots/round-1` → **25 张报问题**。

### 问题与修正

| # | 问题（自动判定 + 目检） | 证据 | 修改 | 轮次 2 复验 |
|---|---|---|---|---|
| P1 | 背面机位把环状表带切出画面：机位按机身取景，未考虑 57 mm 表带环 | 20 张 `back` 报 `subject clipped by frame` | 背面机位 (58,92,−132)→(72,112,−178)，目标点 z=−6→−20 | 全部在框内 |
| P2 | 陶瓷版整体偏暗（mean_lum 79–89），与"高光白瓷"不符 | 5 张 `pearl` 报亮度越界 | 陶瓷中框 baseColor `#eae7e1`→`#f2efe9`，roughness 0.10→0.085 | 94.5（区间 68–215） |
| P3 | 编织表带与普通硅胶难以区分：织纹周期 0.4 mm，肉眼不可见 | `round-1/glacier/woven/lug.png` | 织纹周期 16 px→76 px（约 2.2 mm/根），法线强度 2.6→1.6 | 特写可见经纬 |
| P4 | 米兰尼斯与皮革外观相同 | `round-1/pearl/mesh/*` | 新增 `mesh_normal/mesh_rough`（2.5 mm 网格），metalness 1.0 | 特写可见网格 |
| P5 | 金属链节像"叠硬币"（圆形截面） | `round-1/rose/metal/back.png` | 链节截面改超椭圆（指数 5.5），节长 6.2 mm→5.1 mm | 链节呈扁平片状 |
| P6 | "表带连接处"机位拍到空场景/纯暗面 | `round-1/*/lug.png`（修复前版本另存 `docs/evidence/lug-before-fix.png`） | 机位改为 (74,52,82) 看向上端接缝，fov 22 | 可辨包覆唇边与表带截面 |

### 记录在案、本轮未修

- 表带 lug 从"包裹机身"过渡到"扁平表带"的区域仍有一条较硬的折线。属造型过渡，不影响尺寸与连接结构。
- 表带孔壁为直壁、无倒角（面数取舍）。
- 表带扣件（蝶形扣/磁吸扣）未建模为可动机构。

---

## [轮次 2] 修正后复检

采集：`tools/shoot.mjs --round 2`（175 张）。
判定：`tools/analyze.py snapshots/round-2` → **0 张报问题**。

用同一套规则对比两轮：

| 指标 | 轮次 1 | 轮次 2 |
|---|---|---|
| 有问题截图 | 25 / 175 | **0 / 175** |
| 被画面裁切 | 20 | 0 |
| 亮度越界 | 5 | 0 |
| 页面运行时错误 | 0（仅 favicon 404） | 0 |

配色平均亮度（判定区间见 `tools/analyze.py`）：

| 配色 | 轮次 1 | 轮次 2 | 区间 |
|---|---|---|---|
| midnight | 33.7 | 33.7 | 18–90 |
| glacier | 88.9 | 88.9 | 55–175 |
| rose | 86.1 | 86.1 | 40–165 |
| pearl | 79.3 | 94.5 | 68–215 |
| glimmer | 72.7 | 72.7 | 45–190 |

> 除 pearl 外两轮数值相同，因为 P1/P3/P4/P5 改的是机位与表带质感，不改变机身配色。
> lug 机位修好后对两轮做了同机位补拍，保证 175 张矩阵可比。

---

## [验收] 8 个随机角度

`tools/acceptance.mjs`（固定种子，可复现）→ `snapshots/acceptance/angle-1..8.png`。

角度：az 283/255/312/78/83/226/173/93°，el 39/−15/−5/−14/−3/28/−25/16°，dist 182–217 mm。

逐张对照 `references/manifest.md` 的参考图检查：

| 检查项 | 结论 |
|---|---|
| 机身长宽比 2.07、厚度 10.95 | 与 R01/T05 一致 |
| 屏幕占比与黑边 | 与 R01 像素测量一致（2.42 mm） |
| 传感器区域、双触点可见 | 与 T06/T12 一致（angle 6） |
| 表带与机身连接处无断裂/穿模 | 8 个角度均无 |
| 金属件反光方向与强度 | 与 R05/T10 的"哑光侧壁 + 亮面切边"一致 |
| 无空白/加载失败 | 8/8 正常 |

未达到参考图水准的部分（诚实记录）：表带整体仍偏"宽扁带"，官方渲染中表带贴身弧线与 lug 的过渡更柔和；
孔洞的排列比实物更规则。这两点属造型细化，未在本轮修改。

---

## [功能回归]

`tools/features.mjs`（Playwright 驱动真实交互）→ 8/8 PASS：

```
PASS  colourway switches frame colour        (#2f2f33 -> #f2efe9)
PASS  ceramic body is non-metallic           (metalness=0)
PASS  only the selected strap is visible
PASS  strap colour picker applies            (#7a4a2a)
PASS  uploaded image replaces the watch face
PASS  camera preset changes viewpoint        ((0,0,152) -> (-172,6,-12))
PASS  canvas screenshot returns PNG data URL (368 KB)
PASS  bend slider rotates the strap bones
```
