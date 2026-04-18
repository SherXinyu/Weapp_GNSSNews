# GNSS Hub

一个原生微信小程序，分成三个主界面。

1. 新闻
2. 高分文章
3. 开源代码

## 当前结构

1. 前端页面在 `pages/news`、`pages/articles`、`pages/code`
2. 数据聚合逻辑在 `utils/feed-service.js`
3. 页面通用逻辑在 `utils/page-factory.js`
4. 可调参数在 `utils/config.js`
5. 后端聚合服务在 `backend`

## 当前接入方式

1. 小程序优先请求你自己的聚合接口
2. 聚合接口再去抓 GDELT、OpenAlex、GitHub
3. 接口失败时会回退到本地示例数据

## 你需要配置的东西

1. 先把后端部署出去，拿到一个 HTTPS 地址
2. 把地址填到 `utils/config.js` 里的 `API_BASE_URL`
3. 在微信公众平台里只配置这个聚合域名

## 后端本地运行

1. 进入 `backend`
2. 执行 `npm start`
3. 默认监听 `8787`

## Render 部署

1. 把这个仓库推到 GitHub
2. 登录 Render，选择 `New +` 再选 `Blueprint`
3. 连接这个仓库
4. Render 会读取根目录的 `render.yaml`
5. 部署完成后复制服务地址
6. 把地址填到 `utils/config.js` 的 `API_BASE_URL`

## 后端接口

1. `GET /health`
2. `GET /api/feeds?type=news`
3. `GET /api/feeds?type=articles`
4. `GET /api/feeds?type=code`

## 上传前检查

1. `project.config.json` 里的 `appid` 要换成正式 AppID
2. 微信公众平台里只保留你的后端域名
3. 重新编译后再上传

## 后续扩展

1. 想加分页，可以在后端接页码参数
2. 想加收藏，可以在前端加本地存储
3. 想加更多源，可以继续在后端加适配器
