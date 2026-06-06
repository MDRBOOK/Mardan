# 咪咪Image

一个可部署到 GitHub Pages 的 OpenAI 图片生成工作台。它提供类似截图的深色双栏界面，可以在浏览器里配置 API Key、模型名、尺寸比例、清晰度、输出格式、压缩质量和生成数量，然后按提示词生成图片。

## 使用

1. 打开 `index.html`。
2. 点击右上角设置按钮。
3. 填入 OpenAI API Key。
4. 按你的账号权限填写图片模型名，例如 `gpt-image-1.5` 或你可用的 `gpt-image-2`。
5. 输入提示词并点击「开始生成」。

API Key 只保存在浏览器 `localStorage`，不会写进仓库文件。

## 部署到 GitHub Pages

1. 新建 GitHub 仓库，例如 `mimi-image`。
2. 把本目录里的文件提交并推送到仓库。
3. 打开仓库 `Settings` → `Pages`。
4. `Build and deployment` 选择 `Deploy from a branch`。
5. Branch 选择 `main`，目录选择 `/root`，保存。
6. 等待 GitHub Pages 发布完成后访问页面地址。

## CORS 提醒

静态网页从浏览器直连 OpenAI API 时，可能受浏览器 CORS 或安全策略影响。若出现 CORS 报错，推荐部署一个你自己的后端代理，把设置里的 API 地址改成代理地址，由后端安全地调用 OpenAI API。

## 文件结构

```text
mimi-image/
  index.html
  assets/
    app.js
    icon.svg
    styles.css
  README.md
```
