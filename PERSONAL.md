# 个人定制版说明（alexzeng2014/Textus）

这是从 [CatVinci-Studio/Textus](https://github.com/CatVinci-Studio/Textus) fork 的个人构建，
只服务一个使用者：中文写作 + OpenCode Go 订阅。

## 改了什么

1. **字体内置**：`src/assets/fonts/SarasaMonoSC-Regular.ttf`（等距更纱黑体 SC，SIL OFL 1.1，
   许可文本见同目录 `OFL.txt`）。`src/ui/base.css` 里注册了同名 `@font-face`，
   所以即使系统没装这个字体也能正常显示。
2. **默认正文字体**：`src/prefs/settings-types.ts` 的 `DEFAULT_SETTINGS.docFont`
   改为 `等距更纱黑体 SC`（新配置开箱即用）。
3. **默认模型**：`com.catvinci.textus` 的默认 provider 改为 `opencode-go`，
   默认对话模型 `glm-5.3`；`src-tauri/src/ai/catalog.rs` 中 OpenCode Go 的
   `known_models` 加入 `glm-5.3`（上游只到 `glm-5.2`），`agent_default_model` 也指向 `glm-5.3`。
4. **不再跟随官方更新**：`src-tauri/tauri.conf.json` 的 updater 端点改为本仓库，
   `createUpdaterArtifacts` 关闭。官方更新不会再覆盖这个构建；
   要升级就重新编译并发布一次（见下）。

## 构建（Windows）

```powershell
npm ci
npx tauri build --bundles nsis
```

产物：`src-tauri/target/release/bundle/nsis/Textus_<版本>_x64-setup.exe`。

前置：Node 22+、Rust stable（MSVC 目标）、Visual Studio Build Tools（C++ 与 Windows SDK）、
Edge WebView2 Runtime（Windows 10/11 通常自带）。

## 许可

上游代码 MIT；内置字体 SIL Open Font License 1.1。两者原文分别在
`LICENSE` 与 `src/assets/fonts/OFL.txt`。
