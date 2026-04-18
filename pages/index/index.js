Page({
  data: {
    welcome: "进入新闻列表",
    username: "NEWS APP",
    avatarLetter: "N",
    subtitle: "这是旧首页占位页，当前路由已切到三主界面版本。"
  },
  bindViewTap: function () {
    wx.navigateTo({
      url: "../news/news"
    })
  },
  onLoad: function () {
    console.log("home onLoad")
  }
})
