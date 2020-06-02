const mockFs = require("mock-fs");

const { buildThemeStyles, buildThemeVariables } = require("../build");

beforeAll(() => {
  mockFs({
    "/empty-dir": {},
    "/my-project/less-sources-dir": {
      variables: {
        "colors.less": `
### START variables/colors.less ###
@colors-primary: #ff0000;
@colors-dark: #333;
### END variables/colors.less ###
`,
        "buttons.less": `
### START variables/buttons.less ###
@button-padding: 10px;
### END variables/buttons.less ###
`,
      },
      base: {
        "buttons.less": `
### START styles/buttons.less ###
button {
  color: @colors-primary;
  padding: @button-padding;
}
### END styles/buttons.less ###
`,
        "typography.less": `
### START styles/typography.less ###
h1 {
  font-weight: bold;
  color: @colors-dark;
}
### END styles/typography.less ###
`,
      },
    },
  });
});

afterAll(() => {
  mockFs.restore();
});

test("should return an empty string when building styles if there are no LESS files in the dir passed", async () => {
  const themeStyles = await buildThemeStyles("/empty-dir");
  await expect(themeStyles).toBe("");
});

it("should not include any variable definition when building styles", async () => {
  const themeStyles = await buildThemeStyles("/my-project/less-sources-dir");
  await expect(themeStyles).not.toMatch(/### START variables/);
});

test("should return an empty string when building variables if there are no LESS files in the dir passed", async () => {
  const themeVariables = await buildThemeVariables("/empty-dir");
  await expect(themeVariables).toBe("");
});

it("should not include any theme styles when building variables", async () => {
  const themeVariables = await buildThemeVariables("/my-project/less-sources-dir");
  await expect(themeVariables).not.toMatch(/### START styles/);
});
