module.exports = {
  // I'm using the "ui" version because OCC sends the
  // FILE_OAUTH_TOKEN cookie only when an API is a "ui" one.
  // This token is required for file upload endpoints.
  COMMERCE_ADMIN: "ccadminui",
  COMMERCE_AGENT: "ccagentui",
  COMMERCE_STOREFRONT: "ccstoreui",
};
