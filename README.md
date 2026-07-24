# 饮食追踪 Diet Tracker

一款面向日常生活的移动端饮食记录与营养分析工具。它帮助用户把“今天吃了什么”转化为可理解、可执行的饮食反馈，适用于在家做饭、学校食堂、外卖与便利店等不同条件。

项目采用 Vue 3、TypeScript、Vite、Pinia、Vant 与 Capacitor 构建，可作为网页使用，也可打包为 Android 应用。

## 适合谁使用

- 希望建立稳定记录习惯、改善饮食规律的普通用户
- 时间有限、主要在食堂或外卖场景用餐的学生与上班族
- 希望按预算、烹饪条件和食物可得性安排下一餐的家庭用户
- 需要在医生或营养师既定方案下关注蛋白质、钾、磷、钠等指标的慢性病用户

## 核心能力

- 快速记录早餐、午餐、晚餐和加餐，按重量自动汇总热量、三大营养素、膳食纤维、钾、磷和钠
- 内置食物库，按食材、包装食品标签和估算食物区分数据来源与可信度
- 提供主食、肉类水产、蔬菜、水果、豆制品、乳制品、坚果种子等常见类别，支持自定义食物
- 基于体重生成每日参考目标，显示进度、偏高或偏低风险以及长期趋势
- 根据家庭做饭、食堂、外卖、便利店等用餐来源，给出更容易执行的下一餐建议
- 通过连续记录、历史回顾和趋势统计，降低“记几天就放弃”的成本
- 支持加密备份与恢复，用户记录默认保存在本地设备

## 特殊人群支持

“养生模式”面向需要关注低钾、低磷和低钠饮食的用户，提供食物中钾、磷、钠与可利用磷的可视化风险提示，并支持录入由医生或营养师给出的个人目标。

营养参考范围与食物数据会标注来源和数据版本。内置参考包括 USDA FoodData Central、WHO/FAO 与 KDIGO 等公开资料。复合菜、食堂菜和外卖菜的营养成分存在客观估算误差，应用会将其作为估算值呈现。

> 本项目用于饮食记录与健康教育，不提供诊断、处方或紧急医疗建议。肾功能不全、透析、孕期、儿童、进食障碍或正在接受治疗的用户，应以医生、注册营养师和个人化治疗方案为准。

## Android 安装与更新

Android 包位于 `diet-tracker/android/app/build/outputs/apk/`。将 APK 复制到手机后，允许当前文件管理器“安装未知应用”即可安装。

**正式安装包下载：** [Diet Tracker v1.1.4 for Android](https://cheng-39.github.io/RECORD_DAILY_DATA/downloads/diet-tracker-v1.1.4.apk)

应用启动时会检查 GitHub Pages 上的更新清单，也可以在“统计分析 → 应用版本更新”中手动检查。发现新版本后，客户端会在应用私有缓存中下载 APK，并依次校验 SHA-256、applicationId、版本号和签名证书，再交由 Android 系统安装页完成覆盖更新。首次使用需要允许本应用安装未知应用；授权后返回应用会自动继续。系统确认步骤不会被应用绕过。

发布新版本时只需同时提升 `diet-tracker/android/app/build.gradle` 中的 `versionCode` 与 `versionName`，然后将代码推送到 `main`。GitHub Actions 会自动完成正式签名构建、包名/版本/证书校验、更新清单生成、GitHub Release 发布和 Pages 部署；普通网页更新则复用当前版本的 Release，不会覆盖回旧 APK。

自动发布需要在 GitHub Actions Secrets 中配置 `ANDROID_KEYSTORE_BASE64`、`ANDROID_KEYSTORE_PASSWORD`、`ANDROID_KEY_ALIAS` 和 `ANDROID_KEY_PASSWORD`。工作流还会固定核验公开证书指纹，错误密钥无法发布不兼容更新。

已在 D 盘保存签名配置的维护者，可以在使用具备仓库管理权限的 GitHub CLI 登录后运行 `powershell -ExecutionPolicy Bypass -File diet-tracker/scripts/configure-github-release-secrets.ps1`，脚本会直接读取本地密钥并安全写入四项 Secrets，不会打印密码或密钥内容。该步骤只需执行一次。

正式公开分发前，请使用并安全备份专用发布签名密钥。Android 只允许使用同一签名证书的新版覆盖旧版。

## 本地运行

```bash
cd diet-tracker
npm install
npm run dev
```

常用命令：

```bash
npm run build
npm run android:apk
npm run android:release
npm run test
```

Android 本地构建需要配置 JDK、Android SDK 和 Gradle。仓库内的 `scripts/build-android.ps1` 用于构建调试 APK；`scripts/build-android-release.ps1` 读取 D 盘本地签名配置后构建正式 APK。

## 数据与隐私

- 饮食记录保存在浏览器或应用本地存储中，不会自动上传到服务端。
- 备份功能使用用户设置的口令进行加密；请自行保管备份文件和口令。
- 食物数据库会持续修订。包装食品请优先使用包装标签，菜品和混合餐食请将结果视为合理估算而非精确检测值。
