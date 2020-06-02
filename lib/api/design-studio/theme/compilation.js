/**
 * The list of all available compilation status.
 */
const CompilationStatus = {
  IN_PROGRESS: 100,
  SUCCESS: 101,
  FAILURE: 102,
};

async function _getActiveTheme(occClient, siteId) {
  const { items: activeThemes } = await occClient.getActiveTheme();
  return activeThemes.find((activeTheme) => activeTheme.associatedSites.some((site) => site.repositoryId === siteId));
}

const _triggerThemeCompilationDefaultOptions = {
  siteId: "siteUS",
};

/**
 * Ask OCC to compile a theme.
 *
 * @param {*} occClient An OCC client instance.
 * @param {*} options The available options are:
 *
 * - **siteId** ID of the site where the theme will be compiled. Defaults to `siteUS`.
 * - **themeId** ID of a specific theme to be compiled. Defaults to the active theme for the specified site.
 */
async function triggerThemeCompilation(occClient, options = _triggerThemeCompilationDefaultOptions) {
  const opts = Object.assign({}, _triggerThemeCompilationDefaultOptions, options);
  let themeId = opts.themeId;

  if (!themeId) {
    const theme = await _getActiveTheme(occClient, opts.siteId);

    if (!theme) {
      throw new Error(`No active themes found for the site specified: "${opts.siteId}".`);
    }

    themeId = theme.id;
  }

  console.log(themeId);
  // const themeInfo = await occClient.compileTheme(themeId, { data: { siteId: opts.siteId } })

  // return (themeInfo.compilationStatuses || []).find((s) => s.siteId === opts.siteId)
}

module.exports = {
  CompilationStatus,
  triggerThemeCompilation,
};
