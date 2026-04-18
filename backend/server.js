const http = require("node:http")
const { URL } = require("node:url")

const PORT = Number(process.env.PORT || 8787)
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 10 * 60 * 1000)
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000)
const BASE_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json; charset=utf-8"
}

const FALLBACK = {
  news: [
    {
      id: "news-fallback-1",
      title: "GNSS industry demo",
      summary: "Fallback item used when upstream APIs are unavailable.",
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
      title: "GNSS paper demo",
      summary: "Fallback item used when upstream APIs are unavailable.",
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
      title: "GNSS code demo",
      summary: "Fallback item used when upstream APIs are unavailable.",
      source: "Local Demo",
      time: "updated 2026-04",
      tags: ["Python", "工具链"],
      meta: ["语言: Python", "Stars: 0"],
      link: "https://example.com/gnss/code"
    }
  ]
}

const cache = new Map()

function normalizeText(value) {
  return value == null ? "" : String(value)
}

function uniqueTags(list) {
  const seen = new Set()
  const result = []

  for (const value of list) {
    if (value && !seen.has(value)) {
      seen.add(value)
      result.push(value)
    }
  }

  return result
}

function normalizeLink(url) {
  const text = normalizeText(url)

  if (!text) {
    return "https://example.com"
  }

  if (text.startsWith("http://")) {
    return "https://" + text.slice(7)
  }

  if (text.startsWith("//")) {
    return "https:" + text
  }

  return text
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

function getFallbackFeed(type) {
  return (FALLBACK[type] || []).map(cloneItem)
}

function makeQueryString(params) {
  const parts = []

  for (const key of Object.keys(params)) {
    const value = params[key]
    if (value !== undefined && value !== null && value !== "") {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value))
    }
  }

  return parts.join("&")
}

function requestJson(url, headers) {
  return new Promise(function (resolve, reject) {
    const controller = new AbortController()
    const timer = setTimeout(function () {
      controller.abort()
    }, REQUEST_TIMEOUT_MS)

    fetch(url, {
      method: "GET",
      headers: headers || {},
      signal: controller.signal
    }).then(async function (response) {
      clearTimeout(timer)

      if (!response.ok) {
        throw new Error("HTTP " + response.status)
      }

      const text = await response.text()

      if (!text) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(text))
      } catch (error) {
        resolve({})
      }
    }).catch(function (error) {
      clearTimeout(timer)
      reject(error)
    })
  })
}

function buildNewsUrl() {
  return "https://api.gdeltproject.org/api/v2/doc/doc?" + makeQueryString({
    query: '(GNSS OR BeiDou OR Beidou OR GPS OR Galileo OR "satellite navigation")',
    mode: "artlist",
    maxrecords: 20,
    sort: "datedesc",
    format: "json",
    timespan: process.env.GDELT_TIMESPAN || "7d"
  })
}

function buildArticlesUrl() {
  const params = {
    search: process.env.OPENALEX_QUERY || "GNSS",
    filter: "from_publication_date:" + (process.env.OPENALEX_FROM_DATE || "2020-01-01") + ",type:journal-article",
    sort: "cited_by_count:desc",
    per_page: 20
  }

  if (process.env.OPENALEX_MAILTO) {
    params.mailto = process.env.OPENALEX_MAILTO
  }

  return "https://api.openalex.org/works?" + makeQueryString(params)
}

function buildCodeUrl() {
  return "https://api.github.com/search/repositories?" + makeQueryString({
    q: process.env.GITHUB_QUERY || "(GNSS OR BeiDou OR Beidou) in:name,description,readme fork:false",
    sort: "stars",
    order: "desc",
    per_page: 20
  })
}

function buildAbstract(work) {
  if (!work.abstract_inverted_index) {
    return ""
  }

  const index = work.abstract_inverted_index
  const words = []

  for (const key of Object.keys(index)) {
    words[index[key][0]] = key
  }

  return words.join(" ").replace(/\s+/g, " ").trim()
}

function normalizeItem(item, type, index) {
  return {
    id: item.id || type + "-" + index,
    title: normalizeText(item.title),
    summary: normalizeText(item.summary),
    source: normalizeText(item.source),
    time: normalizeText(item.time),
    tags: uniqueTags(item.tags || []),
    meta: uniqueTags(item.meta || []),
    link: normalizeLink(item.link)
  }
}

function parseGdelt(payload) {
  const sourceList = payload && (payload.articles || payload.article || payload.items || payload.results) || []
  const list = Array.isArray(sourceList) ? sourceList : []
  const result = []

  for (let i = 0; i < list.length; i++) {
    const item = list[i]
    const title = normalizeText(item.title || item.seendate || item.domain)
    const summary = normalizeText(item.description || item.snippet || item.source || item.domain)
    const source = normalizeText(item.domain || item.source || item.sourcecountry || "GDELT")
    const time = normalizeText(item.seendate || item.datetime || item.datetimeprecision || "")
    const tags = uniqueTags(["新闻", item.sourcecountry, item.language, item.domain])
    const meta = uniqueTags([
      item.sourcecountry ? "国家: " + item.sourcecountry : "",
      item.language ? "语言: " + item.language : "",
      item.domain ? "来源: " + item.domain : ""
    ])

    result.push(normalizeItem({
      id: item.url || "gdelt-" + i,
      title: title,
      summary: summary,
      source: source,
      time: time ? time.slice(0, 10) : "",
      tags: tags,
      meta: meta,
      link: item.url || item.link || item.sourceurl || item.mobileurl
    }, "news", i))
  }

  return result
}

function parseOpenAlex(payload) {
  const list = payload && payload.results ? payload.results : []
  const result = []

  for (let i = 0; i < list.length; i++) {
    const work = list[i]
    const sourceName = work.primary_location && work.primary_location.source ? work.primary_location.source.display_name : "OpenAlex"
    const openAccess = work.open_access && work.open_access.is_oa ? "开放获取" : "非开放获取"
    const authors = []
    const authorships = work.authorships || []

    for (let j = 0; j < authorships.length && j < 3; j++) {
      authors.push(authorships[j].author && authorships[j].author.display_name ? authorships[j].author.display_name : "")
    }

    const tags = uniqueTags([
      work.type === "journal-article" ? "高分" : work.type,
      openAccess,
      work.publication_year ? String(work.publication_year) : ""
    ])
    const meta = uniqueTags([
      "引用: " + normalizeText(work.cited_by_count || 0),
      "期刊: " + normalizeText(sourceName),
      work.primary_location && work.primary_location.source && work.primary_location.source.issn_l ? "ISSN: " + work.primary_location.source.issn_l : "",
      authors.length ? "作者: " + authors.join("、") : ""
    ])

    result.push(normalizeItem({
      id: work.id || work.doi || "openalex-" + i,
      title: normalizeText(work.display_name),
      summary: buildAbstract(work) || normalizeText(work.abstract || work.title || ""),
      source: normalizeText(sourceName),
      time: normalizeText(work.publication_date || work.publication_year || ""),
      tags: tags,
      meta: meta,
      link: work.doi ? "https://doi.org/" + work.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "") : work.id
    }, "articles", i))
  }

  return result
}

function parseGithub(payload) {
  const list = payload && payload.items ? payload.items : []
  const result = []

  for (let i = 0; i < list.length; i++) {
    const repo = list[i]
    const tags = uniqueTags([
      repo.language || "",
      "GitHub",
      repo.topics && repo.topics.length ? repo.topics[0] : ""
    ])
    const meta = uniqueTags([
      "Stars: " + normalizeText(repo.stargazers_count || 0),
      "Forks: " + normalizeText(repo.forks_count || 0),
      "语言: " + normalizeText(repo.language || "Unknown")
    ])

    result.push(normalizeItem({
      id: repo.id || repo.full_name || "github-" + i,
      title: normalizeText(repo.full_name || repo.name),
      summary: normalizeText(repo.description || "No description"),
      source: "GitHub",
      time: normalizeText(repo.updated_at || repo.pushed_at || repo.created_at || ""),
      tags: tags,
      meta: meta,
      link: repo.html_url || repo.url
    }, "code", i))
  }

  return result
}

function sortByLatest(list) {
  return list.slice().sort(function (a, b) {
    return normalizeText(b.time).localeCompare(normalizeText(a.time))
  })
}

function buildProxyLikeResponse(type, items) {
  return {
    type: type,
    generatedAt: new Date().toISOString(),
    items: items,
    source: "proxy"
  }
}

async function loadRemoteFeed(type) {
  if (type === "news") {
    const payload = await requestJson(buildNewsUrl())
    return sortByLatest(parseGdelt(payload))
  }

  if (type === "articles") {
    const payload = await requestJson(buildArticlesUrl(), {
      Accept: "application/json",
      "User-Agent": process.env.OPENALEX_USER_AGENT || "GNSS Hub"
    })
    return sortByLatest(parseOpenAlex(payload))
  }

  if (type === "code") {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": process.env.GITHUB_USER_AGENT || "GNSS Hub"
    }

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = "Bearer " + process.env.GITHUB_TOKEN
    }

    const payload = await requestJson(buildCodeUrl(), headers)
    return sortByLatest(parseGithub(payload))
  }

  return []
}

async function loadFeed(type) {
  const cacheKey = type
  const cached = cache.get(cacheKey)
  const now = Date.now()

  if (cached && cached.expiresAt > now) {
    return {
      cached: true,
      payload: cached.payload
    }
  }

  try {
    const items = await loadRemoteFeed(type)
    const payload = buildProxyLikeResponse(type, items.length ? items : getFallbackFeed(type))
    cache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      payload: payload
    })
    return {
      cached: false,
      payload: payload
    }
  } catch (error) {
    const payload = buildProxyLikeResponse(type, getFallbackFeed(type))
    return {
      cached: false,
      payload: payload
    }
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, BASE_HEADERS)
  res.end(JSON.stringify(payload))
}

function sendCors(res) {
  res.writeHead(204, BASE_HEADERS)
  res.end()
}

function normalizeType(value) {
  const text = normalizeText(value).toLowerCase()

  if (text === "news" || text === "articles" || text === "code") {
    return text
  }

  return ""
}

const server = http.createServer(async function (req, res) {
  const url = new URL(req.url || "/", "http://127.0.0.1")
  const typeFromPath = url.pathname.replace(/^\/api\/feeds\/?/, "")
  const type = normalizeType(url.searchParams.get("type") || typeFromPath)

  if (req.method === "OPTIONS") {
    sendCors(res)
    return
  }

  if (url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      time: new Date().toISOString()
    })
    return
  }

  if (url.pathname === "/api/feeds" || url.pathname.indexOf("/api/feeds/") === 0) {
    if (!type) {
      sendJson(res, 400, {
        error: "type must be news, articles, or code"
      })
      return
    }

    const result = await loadFeed(type)
    sendJson(res, 200, {
      type: type,
      cached: result.cached,
      generatedAt: result.payload.generatedAt,
      items: result.payload.items,
      source: result.payload.source
    })
    return
  }

  sendJson(res, 404, {
    error: "not found"
  })
})

server.listen(PORT, "0.0.0.0", function () {
  console.log("GNSS hub backend listening on http://0.0.0.0:" + PORT)
})
