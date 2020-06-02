const colors = require("../../theme");

function getWelcomeBannerText(appVersion) {
  let bannerText = colors.primary(`                            _              _     
    ___   ___ ___          | |_ ___   ___ | |___ 
   / _ \\ / __/ __|  _____  | __/ _ \\ / _ \\| / __|
  | (_) | (_| (__  |_____| | || (_) | (_) | \\__ \\
   \\___/ \\___\\___|          \\__\\___/ \\___/|_|___/
  `);

  bannerText += `
  :: ${colors.bold("occ-tools")} ::               ( ${colors.bold(appVersion)} )

  `;

  return bannerText;
}

module.exports = {
  getWelcomeBannerText,
};
