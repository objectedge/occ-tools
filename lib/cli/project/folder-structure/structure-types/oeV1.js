const { join } = require("path");
const FolderType = require("../FolderType");

const middleware = "middleware";
const storefront = "storefront";
const frontendRoot = storefront;
const backendRoot = middleware;
const sseRoot = "server-side-extensions";
const sseLogs = join(sseRoot, "logs");
const appLevelJs = join(storefront, "app-level");
const customProperties = join(storefront, "custom-properties");
const emailTemplates = join(storefront, "emails");
const emailTemplatesSamples = join(emailTemplates, "samples");
const globalElements = join(storefront, "elements");
const globalLocales = join(storefront, "locales");
const media = join(storefront, "files");
const extensionsRoot = join(storefront, "settings");
const siteSettingExtensions = join(extensionsRoot, "config");
const paymentGatewayExtensions = join(extensionsRoot, "gateway");
const themeSources = join(storefront, "less");
const themeGeneratedFiles = join(storefront, "themes");
const stacks = join(storefront, "stacks");
const stacksCustom = join(stacks, "objectedge");
const stacksOotb = join(stacks, "oracle");
const widgets = join(storefront, "widgets");
const widgetsCustom = join(widgets, "objectedge");
const widgetsOotb = join(widgets, "oracle");

module.exports = {
  [FolderType.FRONTEND_ROOT]: frontendRoot,
  [FolderType.BACKEND_ROOT]: backendRoot,
  [FolderType.MIDDLEWARE]: middleware,
  [FolderType.STOREFRONT]: storefront,
  [FolderType.SERVER_SIDE_EXTENSIONS]: sseRoot,
  [FolderType.SERVER_SIDE_EXTENSION_LOGS]: sseLogs,
  [FolderType.APP_LEVEL_JS]: appLevelJs,
  [FolderType.CUSTOM_PROPERTIES]: customProperties,
  [FolderType.EMAIL_TEMPLATES]: emailTemplates,
  [FolderType.EMAIL_TEMPLATES_DATA_SAMPLES]: emailTemplatesSamples,
  [FolderType.GLOBAL_ELEMENTS]: globalElements,
  [FolderType.GLOBAL_LOCALES]: globalLocales,
  [FolderType.MEDIA_FILES]: media,
  [FolderType.MEDIA_FILES_GENERAL]: media,
  [FolderType.MEDIA_FILES_THIRD_PARTY]: media,
  [FolderType.MEDIA_FILES_CRASH_REPORT]: media,
  [FolderType.MEDIA_FILES_COLLECTION]: media,
  [FolderType.MEDIA_FILES_PRODUCT]: media,
  [FolderType.SITE_SETTING_EXTENSIONS]: siteSettingExtensions,
  [FolderType.PAYMENT_GATEWAY_EXTENSIONS]: paymentGatewayExtensions,
  [FolderType.THEME_SOURCES]: themeSources,
  [FolderType.THEME_GENERATED_FILES]: themeGeneratedFiles,
  [FolderType.STACKS]: stacks,
  [FolderType.STACKS_CUSTOM]: stacksCustom,
  [FolderType.STACKS_OOTB]: stacksOotb,
  [FolderType.WIDGETS]: widgets,
  [FolderType.WIDGETS_CUSTOM]: widgetsCustom,
  [FolderType.WIDGETS_OOTB]: widgetsOotb,
};
