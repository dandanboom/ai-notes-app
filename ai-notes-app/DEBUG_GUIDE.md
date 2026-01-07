# 语音功能调试指南

如果语音功能无法正常工作，请按照以下步骤排查：

## 1. 检查环境变量

### 本地开发环境
确保 `.env.local` 文件在项目根目录，内容格式：
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Vercel 部署环境
1. 登录 Vercel Dashboard
2. 进入项目设置 → Environment Variables
3. 添加 `OPENAI_API_KEY`，值为你的 OpenAI API Key
4. 重新部署项目

### 验证环境变量是否加载
在浏览器控制台（F12）中，你**不应该**看到：
- "OPENAI_API_KEY 环境变量未设置"
- "API 密钥未配置"

## 2. 检查浏览器控制台

打开浏览器开发者工具（F12），查看 Console 标签页：

### 正常流程应该看到：
1. `🎤 [VoiceHUD] 请求麦克风权限...`
2. `🎤 [VoiceHUD] 开始录音...`
3. `📦 [VoiceHUD] 收到音频数据块: XXX bytes` (多次)
4. `🎤 [VoiceHUD] 停止录音 (取消: false)`
5. `📤 [VoiceHUD] 准备发送音频到服务器...`
6. `📥 [Server Action] 收到请求，开始处理...`
7. `🎤 [Server Action] 开始转录音频到 OpenAI Whisper...`
8. `📝 [Server Action] 转录结果: ...`
9. `✅ [VoiceHUD] 处理完成，结果: ...`

### 常见错误：

#### 错误 1: 麦克风权限被拒绝
```
❌ [VoiceHUD] 启动录音失败: NotAllowedError
```
**解决方案：**
- 点击浏览器地址栏左侧的锁图标
- 允许麦克风权限
- 刷新页面重试

#### 错误 2: 未找到麦克风设备
```
❌ [VoiceHUD] 启动录音失败: NotFoundError
```
**解决方案：**
- 检查设备是否连接麦克风
- 检查系统设置中的麦克风权限

#### 错误 3: 没有录制到音频数据
```
❌ [VoiceHUD] 处理录音失败: 没有录制到音频数据
```
**解决方案：**
- 确保录音时间至少 1 秒
- 检查麦克风是否正常工作
- 尝试在浏览器中测试麦克风（如 Google 的语音搜索）

#### 错误 4: API 密钥无效
```
❌ [Server Action] 处理语音命令失败: 401 Unauthorized
```
**解决方案：**
- 检查 `.env.local` 中的 API Key 是否正确
- 确保 API Key 没有过期
- 在 Vercel 中重新设置环境变量

#### 错误 5: API 调用频率过高
```
❌ [Server Action] 处理语音命令失败: 429 rate limit
```
**解决方案：**
- 等待几分钟后重试
- 检查 OpenAI 账户的 API 使用限制

## 3. 检查网络请求

在浏览器开发者工具的 Network 标签页中：

1. 过滤 "Fetch/XHR" 请求
2. 查找发送到服务器的请求
3. 检查请求状态码：
   - `200` = 成功
   - `401` = API 密钥错误
   - `429` = 频率限制
   - `500` = 服务器错误

## 4. 测试步骤

### 步骤 1: 测试麦克风权限
1. 打开浏览器控制台
2. 长按语音按钮（按住 0.5 秒以上）
3. 应该看到权限请求弹窗
4. 点击"允许"

### 步骤 2: 测试录音
1. 长按语音按钮
2. 说话（至少 1-2 秒）
3. 松手
4. 查看控制台日志，确认：
   - 是否收到音频数据块
   - 音频 Blob 大小是否 > 0

### 步骤 3: 测试 API 调用
1. 完成录音后
2. 查看控制台中的 Server Action 日志
3. 确认是否成功调用 OpenAI API

## 5. 常见问题排查

### Q: 录音按钮没有反应
- 检查是否在 HTTPS 或 localhost 环境下（MediaRecorder 需要安全上下文）
- 检查浏览器是否支持 MediaRecorder API

### Q: 录音成功但没有结果
- 检查控制台是否有错误信息
- 检查网络请求是否成功
- 检查 OpenAI API Key 是否正确配置

### Q: 转录结果为空
- 确保说话声音足够大
- 确保录音时间足够长（至少 1-2 秒）
- 尝试说中文，因为设置了 `language: "zh"`

### Q: 在 Vercel 上无法工作
- 确保在 Vercel 项目设置中添加了 `OPENAI_API_KEY` 环境变量
- 确保环境变量作用域设置为 "Production, Preview, Development"
- 重新部署项目

## 6. 获取帮助

如果以上步骤都无法解决问题，请提供：
1. 浏览器控制台的完整错误日志
2. Network 标签页中的请求详情
3. 你使用的浏览器和版本
4. 是本地开发还是 Vercel 部署

