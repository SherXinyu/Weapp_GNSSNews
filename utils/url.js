var config = require('./config.js')

function toHttps(url) {
  if (!url) {
    return ''
  }

  if (url.indexOf('http://') === 0) {
    return 'https://' + url.slice(7)
  }

  return url
}

function normalizeImageUrl(url) {
  var normalized = toHttps(url)
  return normalized || config.PLACEHOLDER_IMAGE
}

function normalizeArticleLink(url) {
  var normalized = toHttps(url)

  if (!normalized) {
    return config.DEFAULT_ARTICLE_HOST
  }

  if (normalized.indexOf('http') !== 0) {
    return config.DEFAULT_ARTICLE_HOST + normalized
  }

  return normalized
}

function safeText(value) {
  return value == null ? '' : String(value)
}

module.exports = {
  normalizeImageUrl: normalizeImageUrl,
  normalizeArticleLink: normalizeArticleLink,
  safeText: safeText
}
