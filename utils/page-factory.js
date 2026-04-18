var feedService = require("./feed-service.js")

function createFeedPage(type) {
  var pageConfig = feedService.getPageConfig(type)

  return {
    data: {
      loading: true,
      pageConfig: pageConfig,
      keyword: "",
      activeFilter: "全部",
      allItems: [],
      visibleItems: [],
      detailHidden: true,
      detailItem: {},
      detailTags: []
    },
    onLoad: function () {
      this.bootstrap()
    },
    bootstrap: function () {
      var self = this
      var defaultFilter = pageConfig && pageConfig.filters && pageConfig.filters.length ? pageConfig.filters[0] : "全部"

      this.setData({
        loading: true
      })

      feedService.loadFeed(type).then(function (items) {
        var list = items || []

        self.setData({
          allItems: list,
          visibleItems: feedService.filterFeed(list, "", defaultFilter),
          loading: false
        })
      }).catch(function () {
        self.setData({
          allItems: [],
          visibleItems: [],
          loading: false
        })
      })
    },
    applyFilters: function (keyword, activeFilter) {
      var nextKeyword = keyword !== undefined ? keyword : this.data.keyword
      var nextFilter = activeFilter || this.data.activeFilter

      this.setData({
        keyword: nextKeyword,
        activeFilter: nextFilter,
        visibleItems: feedService.filterFeed(this.data.allItems, nextKeyword, nextFilter)
      })
    },
    onKeywordInput: function (e) {
      this.applyFilters(e.detail.value, this.data.activeFilter)
    },
    clearKeyword: function () {
      this.applyFilters("", this.data.activeFilter)
    },
    onFilterTap: function (e) {
      var filter = e.currentTarget.dataset.filter
      this.applyFilters(this.data.keyword, filter)
    },
    openDetail: function (e) {
      var index = Number(e.currentTarget.dataset.index)
      var item = this.data.visibleItems[index]

      if (!item) {
        return
      }

      this.setData({
        detailItem: item,
        detailTags: item.tags || [],
        detailHidden: false
      })
    },
    closeDetail: function () {
      this.setData({
        detailHidden: true
      })
    },
    noop: function () {},
    copyLink: function () {
      var link = this.data.detailItem.link

      if (!link) {
        wx.showToast({
          title: "没有链接",
          icon: "none"
        })
        return
      }

      wx.setClipboardData({
        data: link,
        success: function () {
          wx.showToast({
            title: "链接已复制",
            icon: "success"
          })
        }
      })
    }
  }
}

module.exports = {
  createFeedPage: createFeedPage
}
