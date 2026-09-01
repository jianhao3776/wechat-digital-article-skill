# 微信公众号数字媒体排版 Skill

把中文文章或 Markdown 文件渲染成可直接复制到微信公众号编辑器的数字媒体风格 HTML。

## 特点

- 复制区不包含文章主标题，适配微信公众号独立标题栏
- 保留二级标题、分隔线、粗体与正文段落
- 样式全部内联，便于粘贴到微信公众号编辑器
- 同时写入富文本与纯文本剪贴板，并提供兼容回退
- 纯本地处理，无网络请求、外部字体或第三方依赖
- 不改写、不总结、不核查文章内容，除非用户另有要求

## 安装

### 使用 Codex Skill Installer

在 Codex 中输入：

```text
$skill-installer 请从下面的 GitHub 地址安装 Skill：
https://github.com/jianhao3776/wechat-digital-article-skill/tree/main/wechat-digital-article
```

安装后新建一个对话；如果技能列表没有立即刷新，请重启 Codex。

### 手动安装

1. 下载本仓库 ZIP 并解压。
2. 将 `wechat-digital-article` 整个文件夹复制到：
   - 推荐目录：`$HOME/.agents/skills/`
   - 旧版 Codex 桌面目录：`$HOME/.codex/skills/`
3. 新建一个 Codex 对话。

## 使用

可以显式调用：

```text
$wechat-digital-article 用数字媒体版排版这篇文章：/绝对路径/article.md
```

也可以直接说：

```text
用数字媒体版把下面这篇文章排版成可复制到微信公众号的 HTML。
```

输入文章建议使用以下 Markdown 结构：

```markdown
# 文章标题

导语正文。

---

## 小标题

普通正文，支持 **重点强调**。
```

`#` 标题只用于浏览器页面信息，不会进入最终复制区。

## 输出

Skill 会生成一个独立 HTML 文件。用浏览器打开后，点击页面上的复制按钮，再粘贴到微信公众号编辑器即可。

## 隐私

渲染脚本只读取本地 Markdown 并写入本地 HTML，不会上传文章，也不会发起网络请求。

## License

[MIT](LICENSE)
