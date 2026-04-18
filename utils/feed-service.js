var config = require("./config.js")
var urlUtil = require("./url.js")

var PAGE_CONFIG = {
  news: {
    type: "news",
    theme: "theme-news",
    badge: "新闻",
    title: "GNSS 新闻",
    subtitle: "追踪北斗、定位、导航和行业动态",
    summary: "这里聚合 GNSS 领域的最新新闻、会议消息和产业动态。",
    searchPlaceholder: "搜新闻标题、来源或关键词",
    emptyText: "没有匹配的新闻，换个关键词试试。",
    filters: ["全部", "北斗", "定位", "行业", "政策", "会议"]
  },
  articles: {
    type: "articles",
    theme: "theme-articles",
    badge: "文章",
    title: "高分文章",
    subtitle: "筛选高价值论文、综述和方法文章",
    summary: "这里展示 GNSS 方向的论文元数据，适合先看标题、期刊和引用数。",
    searchPlaceholder: "搜文章标题、作者、期刊或关键词",
    emptyText: "没有匹配的文章，换个筛选条件试试。",
    filters: ["全部", "综述", "方法", "高分", "应用", "测评"]
  },
  code: {
    type: "code",
    theme: "theme-code",
    badge: "代码",
    title: "开源代码",
    subtitle: "收录 GNSS 工具、库和处理脚本",
    summary: "这里展示可直接复用的开源项目，优先看语言、星标、更新时间和适用场景。",
    searchPlaceholder: "搜仓库名、语言、标签或关键词",
    emptyText: "没有匹配的代码仓库，换个筛选条件试试。",
    filters: ["全部", "Python", "C++", "工具链", "数据处理", "可视化"]
  }
}

var FALLBACK = {
  news: [
    {
      id: "news-fallback-1",
      title: "GNSS 新闻示例",
      summary: "这是本地 fallback，用来保证后端未部署时页面仍能显示内容。",
      source: "Local Demo",
      time: "2026-04-17",
      tags: ["新闻", "行业"],
      meta: ["来源: Local Demo", "更新: 2026-04-17"],
      link: "https://example.com/gnss/news"
    }
  ],
  articles: [
    {
      id: "article-fallback-1",
      title: "GNSS 论文示例",
      summary: "这是本地 fallback，用来保证后端未部署时页面仍能显示内容。",
      source: "Local Demo",
      time: "2026-04",
      tags: ["高分", "方法"],
      meta: ["期刊: Local Demo", "引用: 0"],
      link: "https://example.com/gnss/article"
    }
  ],
  code: [
    {
      id: "code-fallback-1",
      title: "GNSS 代码示例",
      summary: "这是本地 fallback，用来保证后端未部署时页面仍能显示内容。",
      source: "Local Demo",
      time: "updated 2026-04",
      tags: ["Python", "工具链"],
      meta: ["语言: Python", "Stars: 0"],
      link: "https://example.com/gnss/code"
    }
  ]
}

function cloneItem(item) {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    source: item.source,
    time: item.time,
    tags: item.tags.slice(),
    meta: item.meta.slice(),
    link: item.link
  }
}

function getPageConfig(type) {
  return PAGE_CONFIG[type] || PAGE_CONFIG.news
}

function getFallbackFeed(type) {
  var list = FALLBACK[type] || []
  var result = []

  for (var i = 0; i < list.length; i++) {
    result.push(cloneItem(list[i]))
  }

  return result
}

function normalizeText(value) {
  return value == null ? "" : String(value)
}

function uniqueTags(list) {
  var seen = {}
  var result = []

  for (var i = 0; i < list.length; i++) {
    var value = list[i]
    if (value && !seen[value]) {
      seen[value] = true
      result.push(value)
    }
  }

  return result
}

function normalizeListItem(item, type, index) {
  return {
    id: item.id || type + "-" + index,
    title: normalizeText(item.title),
    summary: normalizeText(item.summary),
    source: normalizeText(item.source),
    time: normalizeText(item.time),
    tags: uniqueTags(item.tags || []),
    meta: uniqueTags(item.meta || []),
    link: urlUtil.normalizeArticleLink(item.link)
  }
}

function requestJson(url, headers) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: url,
      method: "GET",
      header: headers || {},
      success: function (res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error("HTTP " + res.statusCode))
          return
        }

        var data = res.data
        if (typeof data === "string") {
          try {
            data = JSON.parse(data)
          } catch (error) {
            data = {}
          }
        }

        resolve(data)
      },
      fail: function (err) {
        reject(err)
      }
    })
  })
}

function buildProxyEndpoint(type) {
  var base = normalizeText(config.API_BASE_URL).replace(/\/+$/, "")

  if (!base) {
    return ""
  }

  return base + "/api/feeds?type=" + encodeURIComponent(type)
}

function normalizeIncomingItems(payload, type) {
  var list = payload && payload.items ? payload.items : payload
  var sourceList = Array.isArray(list) ? list : []
  var result = []

  for (var i = 0; i < sourceList.length; i++) {
    result.push(normalizeListItem(sourceList[i], type, i))
  }

  return result
}

function sortByLatest(list) {
  return list.slice().sort(function (a, b) {
    return normalizeText(b.time).localeCompare(normalizeText(a.time))
  })
}

function loadFeed(type) {
  var proxyEndpoint = buildProxyEndpoint(type)

  if (!proxyEndpoint) {
    return Promise.resolve(getFallbackFeed(type))
  }

  return requestJson(proxyEndpoint, {
    Accept: "application/json"
  }).then(function (payload) {
    var items = sortByLatest(normalizeIncomingItems(payload, type))
    if (!items.length) {
      return getFallbackFeed(type)
    }

    return items
  }).catch(function () {
    return getFallbackFeed(type)
  })
}

function includesKeyword(item, keyword) {
  if (!keyword) {
    return true
  }

  var text = [
    item.title,
    item.summary,
    item.source,
    item.time,
    item.link,
    item.tags.join(" "),
    item.meta.join(" ")
  ].join(" ").toLowerCase()

  return text.indexOf(keyword.toLowerCase()) !== -1
}

function matchesFilter(item, activeFilter) {
  if (!activeFilter || activeFilter === "全部") {
    return true
  }

  return item.tags.indexOf(activeFilter) !== -1
}

function filterFeed(items, keyword, activeFilter) {
  var result = []

  for (var i = 0; i < items.length; i++) {
    var item = items[i]
    if (matchesFilter(item, activeFilter) && includesKeyword(item, keyword)) {
      result.push(item)
    }
  }

  return result
}

module.exports = {
  getPageConfig: getPageConfig,
  getFeed: getFallbackFeed,
  loadFeed: loadFeed,
  filterFeed: filterFeed
}
