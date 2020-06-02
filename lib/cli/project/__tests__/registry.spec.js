jest.mock("fs-extra", () => ({
  exists: jest.fn(() => Promise.resolve()),
  readJson: jest.fn(() => Promise.resolve()),
  outputJson: jest.fn(() => Promise.resolve()),
}));
jest.mock("../folder-structure");

const mockFs = require("mock-fs");
const fs = require("fs-extra");
const realFsApi = jest.requireActual("fs-extra");
const { ProjectsRegistry } = require("../registry");
const folderStructure = require("../folder-structure");

beforeAll(() => {
  mockFs({
    "/occ-tools-home": {
      "projects.json":
        '[ { "id": "one-project", "path": "/occ-projects/one-project" }, { "id": "another-project", "path": "/occ-projects/another-project" } ]',
    },
    "/occ-projects": {
      "one-project": {
        "occ-tools.project.json":
          '{ "name": "One Project", "environments": [ { "name": "dev", "url": "https://dev.env.com" } ] }',
      },
      "another-project": {
        "occ-tools.project.json":
          '{ "name": "Another Project", "environments": [ { "name": "uat", "url": "https://uat.env.com" } ] }',
      },
      "empty-project": {},
      "one-more-project": {
        "occ-tools.project.json":
          '{ "name": "One More Project", "environments": [ { "name": "qa", "url": "https://qa.env.com" } ] }',
      },
    },
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

it("should allow registry to be initialized only once", async () => {
  fs.exists.mockResolvedValue(false);

  const registry = new ProjectsRegistry("/occ-tools-home/projects.json");

  await registry.init();
  await registry.init();

  expect(fs.exists).toHaveBeenCalledTimes(1);
  expect(fs.outputJson).toHaveBeenCalledTimes(1);
});

it("should create an empty registry file if it doesn't exist yet", async () => {
  fs.exists.mockResolvedValue(false);

  const registry = new ProjectsRegistry("/occ-tools-home/projects.json");

  await registry.init();

  expect(fs.outputJson).toHaveBeenCalledWith("/occ-tools-home/projects.json", []);
});

it("should have no projects registered after intialization if no projects were found on registry file", async () => {
  fs.exists.mockResolvedValue(true);
  fs.readJson.mockResolvedValue([]);

  const registry = new ProjectsRegistry("/occ-tools-home/projects.json");

  await registry.init();

  expect(registry.getRegisteredProjects().length).toBe(0);
});

it("should throw error if anything goes wrong during initialization", async () => {
  fs.exists.mockReturnValue(true);
  fs.readJson.mockRejectedValue(new Error("ENOENT: no such file or directory, open '/occ-tools-home/projects.json'"));

  await expect(new ProjectsRegistry("/occ-tools-home/projects.json").init()).rejects.toThrow(
    "Cannot load projects. ENOENT: no such file or directory, open '/occ-tools-home/projects.json'"
  );
});

it("should all registered projects loaded from registry file after initialization", async () => {
  fs.exists.mockImplementation(realFsApi.exists);
  fs.readJson.mockImplementation(realFsApi.readJson);
  folderStructure.getProjectFolderStructure.mockResolvedValue("oe-v1");

  const registry = new ProjectsRegistry("/occ-tools-home/projects.json");

  await registry.init();

  expect(registry.isProjectRegistered("one-project")).toBe(true);
  expect(registry.isProjectRegistered("another-project")).toBe(true);

  const oneProject = registry.getRegisteredProject("one-project");

  expect(oneProject.descriptor.environments.length).toBe(1);
  expect(oneProject.path).toBe("/occ-projects/one-project");

  const anotherProject = registry.getRegisteredProject("another-project");

  expect(anotherProject.descriptor.environments.length).toBe(1);
  expect(anotherProject.path).toBe("/occ-projects/another-project");
});

it("registering project should throw error if it's not a valid occ project", async () => {
  fs.exists.mockImplementation(realFsApi.exists);
  fs.readJson.mockImplementation(realFsApi.readJson);
  folderStructure.getProjectFolderStructure.mockResolvedValue("oe-v1");

  const registry = new ProjectsRegistry("/occ-tools-home/projects.json");

  await registry.init();
  await expect(registry.registerProject("/occ-projects/empty-project")).rejects.toThrow("Missing project descriptor.");
  expect(fs.outputJson).not.toHaveBeenCalled();
});

it("should throw error if it tries to register a project that's already registered", async () => {
  fs.exists.mockImplementation(realFsApi.exists);
  fs.readJson.mockImplementation(realFsApi.readJson);
  folderStructure.getProjectFolderStructure.mockResolvedValue("oe-v1");

  const registry = new ProjectsRegistry("/occ-tools-home/projects.json");

  await registry.init();
  await expect(registry.registerProject("/occ-projects/one-project")).rejects.toThrow("Project already registered.");
  expect(fs.outputJson).not.toHaveBeenCalled();
});

it("should properly register a new project", async () => {
  fs.exists.mockImplementation(realFsApi.exists);
  fs.readJson.mockImplementation(realFsApi.readJson);
  folderStructure.getProjectFolderStructure.mockResolvedValue("oe-v1");

  const registry = new ProjectsRegistry("/occ-tools-home/projects.json");

  await registry.init();
  await registry.registerProject("/occ-projects/one-more-project");

  expect(registry.isProjectRegistered("one-more-project")).toBe(true);
});

it("unregistering a project should throw error if project is not registered", async () => {
  fs.exists.mockImplementation(realFsApi.exists);
  fs.readJson.mockImplementation(realFsApi.readJson);
  folderStructure.getProjectFolderStructure.mockResolvedValue("oe-v1");

  const registry = new ProjectsRegistry("/occ-tools-home/projects.json");

  await registry.init();
  await expect(registry.unregisterProject("unexistent-project")).rejects.toThrow("Project not registered.");
});

it("should properly unregister a registered project", async () => {
  fs.exists.mockImplementation(realFsApi.exists);
  fs.readJson.mockImplementation(realFsApi.readJson);
  folderStructure.getProjectFolderStructure.mockResolvedValue("oe-v1");

  const registry = new ProjectsRegistry("/occ-tools-home/projects.json");

  await registry.init();
  await registry.registerProject("/occ-projects/one-more-project");

  expect(registry.isProjectRegistered("one-more-project")).toBe(true);

  await registry.unregisterProject("one-more-project");

  expect(registry.isProjectRegistered("one-more-project")).toBe(false);
});
