# 部署说明

## 当前状态

| 步骤 | 状态 |
|---|---|
| 本地生产构建 `npm run build` | 完成，`vite preview` 下页面与模型均正常（`docs/evidence/production-build.png`） |
| Pages 工作流 `.github/workflows/deploy.yml` | 已就绪（build → upload-pages-artifact → deploy-pages） |
| GitHub 仓库创建 / 推送 | **未完成** |

### 阻塞原因

沙箱内可用的 GitHub 集成只有细粒度只读权限：

```
POST https://api.github.com/user/repos  ->  403 Resource not accessible by integration
```

`gh` CLI 未登录（无 token），因此既不能建仓库，也不能推送二进制文件（GLB / PNG / HDR 无法走纯文本 API）。

### 需要的输入

以下任一项即可解除阻塞：

1. 在终端执行 `gh auth login` 完成授权，然后运行 `./deploy.sh`；或
2. 提供一个具备 `repo` 权限的 Personal Access Token（`export GH_TOKEN=...` 后运行 `./deploy.sh`）；或
3. 手动在 GitHub 建好空仓库并给出地址，我只需 `git remote add` + `git push`。

## 部署后自检清单

1. `https://<owner>.github.io/miband10-configurator/` 返回 200；
2. 首屏出现加载动画，约 3–6 秒后模型出现（GLB 6.3 MB）；
3. 点击 5 个配色、5 种表带，画面即时变化；
4. 拖动旋转、滚轮缩放无卡顿；
5. 上传一张图片，表盘立即替换；
6. 点击「保存截图 PNG」下载到本地；
7. 控制台无报错（favicon 404 可忽略）。
