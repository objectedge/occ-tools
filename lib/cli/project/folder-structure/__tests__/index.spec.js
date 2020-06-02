const mockFs = require("mock-fs");

const { getProjectFolderStructure } = require("../index");

beforeAll(() => {
  mockFs({
    "/occ-projects": {
      "empty-project": {},
      "project-with-unsupported-struct": {
        "occ-tools.project.json":
          '{ "name": "Project #1", "folderStructure": { "type": "my-own" }, "environments": [ { "name": "dev", "url": "https://dev.env.com" } ] }',
      },
      "project-with-missing-custom-folders": {
        "occ-tools.project.json":
          '{ "name": "Project #1", "folderStructure": { "type": "custom" }, "environments": [ { "name": "dev", "url": "https://dev.env.com" } ] }',
      },
      "project-with-unknown-struct": {
        "occ-tools.project.json":
          '{ "name": "Project #1", "environments": [ { "name": "dev", "url": "https://dev.env.com" } ] }',
      },
      "project-using-oe-v1": {
        "occ-tools.project.json":
          '{ "name": "Project #1", "environments": [ { "name": "dev", "url": "https://dev.env.com" } ] }',
        storefront: {
          "app-level-js": {},
          emails: {},
          widgets: {},
        },
      },
      "project-using-oe-v2": {
        "occ-tools.project.json":
          '{ "name": "Project #1", "environments": [ { "name": "dev", "url": "https://dev.env.com" } ] }',
        frontend: {
          storefront: {
            "app-level-js": {},
            "email-templates": {},
            widgets: {},
          },
        },
      },
    },
  });
});

afterAll(() => {
  mockFs.restore();
});

it("should throw error if project descriptor is missing", async () => {
  await expect(getProjectFolderStructure("/occ-projects/empty-project")).rejects.toThrow("Missing project descriptor.");
});

it("should throw error if project declares an unknown or unsupported folder structure", async () => {
  await expect(getProjectFolderStructure("/occ-projects/project-with-unsupported-struct")).rejects.toThrow(
    'Unknown folder structure type "my-own" found on project descriptor.'
  );
});

it("should throw error if project declares having a custom folder structure but not folder definitions were specified", async () => {
  await expect(getProjectFolderStructure("/occ-projects/project-with-missing-custom-folders")).rejects.toThrow(
    "Project has custom folder structure but no definition was found on descriptor."
  );
});

it("should throw error if there's no info on structure on descriptor and it's not able to identify the structure", async () => {
  await expect(getProjectFolderStructure("/occ-projects/project-with-unknown-struct")).rejects.toThrow(
    "Cannot identify the folder structure the project is using."
  );
});

it("should properly identify the oe-v1 type of folder structure", async () => {
  await expect(getProjectFolderStructure("/occ-projects/project-using-oe-v1")).resolves.toEqual({ type: "oe-v1" });
});

it("should properly identify the oe-v2 type of folder structure", async () => {
  await expect(getProjectFolderStructure("/occ-projects/project-using-oe-v2")).resolves.toEqual({ type: "oe-v2" });
});
