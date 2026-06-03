# 思政刷题 · 报告委员长

> 一款 **macOS 风格**的思想政治理论刷题 Web 应用 —— 纯单文件 HTML、纯前端、零依赖、本地存储、键盘可玩。
>
> 双击 `index.html` 即可运行，无需安装、无需联网、无需后端。

![HTML](https://img.shields.io/badge/HTML-单文件-orange)
![Dependencies](https://img.shields.io/badge/依赖-0-brightgreen)
![Backend](https://img.shields.io/badge/后端-无-blue)
![Storage](https://img.shields.io/badge/数据-本地存储-lightgrey)

---

## ✨ 功能特性

- **🎯 自定义练习** —— 自由选择题型、题量（5–230 题）、出题顺序（顺序 / 随机）
- **🔁 错题集** —— 自动收集答错的题目，支持一键「错题重练」
- **📊 学习统计** —— 答题进度、正确率、按题型分布一目了然
- **🧠 智能过滤** —— 「仅练习错题」「本会话跳过已答对」
- **💾 数据导入 / 导出** —— 一键备份为 JSON，换设备无缝恢复
- **🌗 浅色 / 深色 / 自动主题** —— 自动跟随系统外观
- **🖼️ 4 张精选背景壁纸** —— 毛玻璃穿透显示
- **🔠 题干字号可调** —— 22px 起，照顾不同阅读习惯
- **⌨️ 完整键盘操作** —— 数字键选项、回车下一题，纯键盘也能刷

---

## 📚 题库

共 **230 题**，覆盖四种题型：

| 题型 | 数量 |
| --- | --- |
| 单选题 | 125 |
| 多选题 | 50 |
| 判断题 | 50 |
| 简答题 | 5 |
| **合计** | **230** |

> 题库数据已内嵌进 `index.html`，应用离线即可运行；`question_bank.json` 为题库源数据，便于查看与维护。

---

## 🚀 快速开始

### 方式一：直接打开（最简单）

下载本仓库后，**双击 `index.html`**，用任意现代浏览器打开即可。
因题库数据内嵌、资源全为相对路径，`file://` 本地直接打开就能完整运行。

### 方式二：本地静态服务器（可选）

```bash
# Python 3
python -m http.server 8000
# 然后浏览器访问 http://localhost:8000
```

### 方式三：部署到 GitHub Pages

1. 将本文件夹内容推送到 GitHub 仓库；
2. 进入仓库 **Settings → Pages**；
3. Source 选择 `main` 分支、根目录 `/`，保存；
4. 稍候即可通过 `https://<用户名>.github.io/<仓库名>/` 访问。

---

## ⌨️ 键盘快捷键

| 按键 | 作用 |
| --- | --- |
| `Ctrl` / `Cmd` + `1`~`5` | 切换页面（首页 / 刷题 / 错题 / 统计 / 设置） |
| `1`~`4` | 选择选项 A / B / C / D（单选、多选） |
| `Y` / `N`（或 `1` / `0`） | 判断题：对 / 错 |
| `Enter` / `→` | 提交后进入下一题 |
| `Esc` | 关闭弹窗 |

---

## 🎨 设计 & 技术

- **设计语言**：致敬 macOS Big Sur 之后的「Spatial Depth + Vibrancy」体系 —— Traffic-Light 窗体、毛玻璃三层堆叠、SF Blue 单强调色、动态光斑底层。
- **技术栈**：原生 HTML + CSS + JavaScript，**无任何框架、无构建步骤、无第三方运行时依赖**。
- **持久化**：浏览器 `localStorage`（命名空间 `mac-quiz-`）。
- **字体**：在线加载 Noto Sans/Serif SC + Inter，离线自动回退到系统字体。

---

## 💾 数据与隐私

所有答题记录、错题、统计、设置**仅保存在你本地浏览器**中，不会上传到任何服务器。

- 「设置 → 导出 JSON」可备份全部数据（文件名形如 `mac-quiz-backup-YYYY-MM-DD.json`）；
- 「设置 → 导入数据」可从备份恢复；
- 清除浏览器数据或更换浏览器会丢失记录，请及时导出备份。

---

## 📂 项目结构

```
mac-quiz/
├── index.html          # 主程序（题库已内嵌，单文件即应用）
├── question_bank.json  # 题库源数据（230 题）
├── backgrounds/        # 4 张背景壁纸
│   ├── bg-1.jpg
│   ├── bg-2.jpg
│   ├── bg-3.jpg
│   └── bg-4.jpg
└── README.md
```

---

## 📝 题库格式

`question_bank.json` 按题型分组，结构如下：

```json
{
  "single": [
    {
      "id": "s1",
      "type": "single",
      "question": "题干……",
      "options": { "A": "选项A", "B": "选项B", "C": "选项C", "D": "选项D" },
      "answer": "B"
    }
  ],
  "multi":  [ /* 多选，answer 如 "ABC" */ ],
  "judge":  [ /* 判断，answer 为 "Y" / "N" */ ],
  "essay":  [ /* 简答，含参考答案 */ ]
}
```

---

## 📄 开源协议

本项目尚未指定开源协议。如需公开发布，建议自行添加 `LICENSE` 文件（如 MIT）。
