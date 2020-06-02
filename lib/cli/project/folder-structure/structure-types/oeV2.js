const { join } = require("path");
const FolderType = require("../FolderType");

const frontendRoot = "frontend";
const backendRoot = "backend";
const middleware = join(backendRoot, "middleware");
const storefront = join(frontendRoot, "storefront");
const sseRoot = join(backendRoot, "server-side-extensions");
const sse = join(sseRoot, "extensions");
const sseLogs = join(sseRoot, "extension-server", "remote-logs");
const appLevelJs = join(storefront, "app-level-js");
const customProperties = join(storefront, "custom-properties");
const emailTemplates = join(storefront, "email-templates");
const emailTemplatesSamples = join(emailTemplates, "data-samples");
const globalElements = join(storefront, "global-elements");
const globalLocales = join(storefront, "global-locales");
const media = join(storefront, "media");
const mediaGeneral = join(media, "general");
const mediaThirdParty = join(media, "third-party");
const mediaCrashReport = join(media, "crash-report");
const mediaCollection = join(media, "collection");
const mediaProduct = join(media, "product");
const siteSettingExtensions = join(storefront, "site-settings");
const paymentGatewayExtensions = join(storefront, "payment-gateways");
const themeSources = join(storefront, "themes");
const stacks = join(storefront, "stacks");
const stacksCustom = join(stacks, "custom");
const stacksOotb = join(stacks, "out-of-the-box");
const widgets = join(storefront, "widgets");
const widgetsCustom = join(widgets, "custom");
const widgetsOotb = join(widgets, "out-of-the-box");

module.exports = {
  [FolderType.FRONTEND_ROOT]: frontendRoot,
  [FolderType.BACKEND_ROOT]: backendRoot,
  [FolderType.MIDDLEWARE]: middleware,
  [FolderType.STOREFRONT]: storefront,
  [FolderType.SERVER_SIDE_EXTENSIONS]: sse,
  [FolderType.SERVER_SIDE_EXTENSION_LOGS]: sseLogs,
  [FolderType.APP_LEVEL_JS]: appLevelJs,
  [FolderType.CUSTOM_PROPERTIES]: customProperties,
  [FolderType.EMAIL_TEMPLATES]: emailTemplates,
  [FolderType.EMAIL_TEMPLATES_DATA_SAMPLES]: emailTemplatesSamples,
  [FolderType.GLOBAL_ELEMENTS]: globalElements,
  [FolderType.GLOBAL_LOCALES]: globalLocales,
  [FolderType.MEDIA_FILES]: media,
  [FolderType.MEDIA_FILES_GENERAL]: mediaGeneral,
  [FolderType.MEDIA_FILES_THIRD_PARTY]: mediaThirdParty,
  [FolderType.MEDIA_FILES_CRASH_REPORT]: mediaCrashReport,
  [FolderType.MEDIA_FILES_COLLECTION]: mediaCollection,
  [FolderType.MEDIA_FILES_PRODUCT]: mediaProduct,
  [FolderType.SITE_SETTING_EXTENSIONS]: siteSettingExtensions,
  [FolderType.PAYMENT_GATEWAY_EXTENSIONS]: paymentGatewayExtensions,
  [FolderType.THEME_SOURCES]: themeSources,
  [FolderType.THEME_GENERATED_FILES]: themeSources,
  [FolderType.STACKS]: stacks,
  [FolderType.STACKS_CUSTOM]: stacksCustom,
  [FolderType.STACKS_OOTB]: stacksOotb,
  [FolderType.WIDGETS]: widgets,
  [FolderType.WIDGETS_CUSTOM]: widgetsCustom,
  [FolderType.WIDGETS_OOTB]: widgetsOotb,
};
