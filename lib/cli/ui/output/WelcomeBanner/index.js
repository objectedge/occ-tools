const { getWelcomeBannerText } = require("./bannerText");

class WelcomeBanner {
  constructor(appVersion) {
    this.banner = getWelcomeBannerText(appVersion);
  }

  show() {
    process.stdout.write(this.banner);
  }
}

module.exports = WelcomeBanner;
