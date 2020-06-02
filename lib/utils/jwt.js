function getExpiryTime(jwtToken) {
  return new Date(JSON.parse(Buffer.from(jwtToken.split(".")[1], "base64").toString("utf-8")).exp * 1000);
}

function isTokenExpired(jwtToken) {
  const expiryTime = getExpiryTime(jwtToken);
  return expiryTime.getTime() > new Date();
}

module.exports = {
  getExpiryTime,
  isTokenExpired,
};
