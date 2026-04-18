var source = require('../news.js')
var config = require('./config.js')
var urlUtil = require('./url.js')

function buildKey(prefix, index) {
  return prefix + '-' + index
}

function normalizeList(list, type) {
  var result = []

  for (var i = 0; i < list.length; i++) {
    var item = list[i]
    result.push({
      id: buildKey(type, i),
      title: urlUtil.safeText(item.title),
      summary: urlUtil.safeText(item.summary),
      account: urlUtil.safeText(item.account),
      date: urlUtil.safeText(item.date),
      word: urlUtil.safeText(item.word),
      timestamp: urlUtil.safeText(item.timestamp),
      link: urlUtil.normalizeArticleLink(item.link),
      srclink: urlUtil.normalizeArticleLink(item.srclink),
      openid: urlUtil.safeText(item.openid),
      img: urlUtil.normalizeImageUrl(item.img)
    })
  }

  return result
}

function normalizeNewsData(raw) {
  var data = raw && raw.data ? raw.data : {}
  var hotwords = normalizeList((data.hotwords || []).concat(data.topwords || []), 'hotword')
  var hotnews = normalizeList((data.hotnews1 || []).concat(data.hotnews2 || []), 'hotnews')
  var topnews = normalizeList(data.topnews || [], 'topnews')

  return {
    hotwords: hotwords,
    hotnews: hotnews,
    topnews: topnews,
    fakeUrl: config.DEFAULT_ARTICLE_HOST + '/s?_biz='
  }
}

function loadNews() {
  return new Promise(function (resolve) {
    if (config.API_BASE_URL) {
      wx.request({
        url: config.API_BASE_URL,
        method: 'GET',
        success: function (res) {
          resolve(normalizeNewsData(res.data))
        },
        fail: function () {
          resolve(normalizeNewsData(source))
        }
      })
      return
    }

    resolve(normalizeNewsData(source))
  })
}

module.exports = {
  loadNews: loadNews,
  normalizeNewsData: normalizeNewsData
}
