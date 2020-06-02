jest.mock("../project/registry", () => ({
  getProjectsRegistry: () => ({
    getRegisteredProjects: jest.fn(),
  }),
}));
jest.mock("fs-extra", () => ({
  exists: jest.fn(() => Promise.resolve()),
  readJson: jest.fn(() => Promise.resolve()),
  outputJson: jest.fn(() => Promise.resolve()),
}));

const fs = require("fs-extra");

const { getProjectsRegistry } = require("../../cli/project/registry");
const { CommandsExecutionContext } = require("../execution-context");

afterEach(() => {
  jest.resetAllMocks();
});

it("should load the execution context only once", async () => {
  fs.exists.mockReturnValue(Promise.resolve(false));

  const executionContext = new CommandsExecutionContext("/occ-tools-home/commands-execution-context.json");

  await executionContext.load();
  await executionContext.load();

  expect(fs.exists).toHaveBeenCalledTimes(1);
  expect(fs.readJson).not.toHaveBeenCalled();
  expect(fs.outputJson).toHaveBeenCalledTimes(1);
});

it("should create a new context file during initial load if it doesn't exists yet", async () => {
  fs.exists.mockReturnValue(Promise.resolve(false));

  const executionContext = new CommandsExecutionContext("/occ-tools-home/commands-execution-context.json");

  await executionContext.load();

  expect(fs.exists).toHaveBeenCalled();
  expect(fs.readJson).not.toHaveBeenCalled();
  expect(fs.outputJson).toHaveBeenCalledWith("/occ-tools-home/commands-execution-context.json", {
    environment: null,
    project: null,
  });
});

it("should throw error if project ID is missing from context data", async () => {
  fs.exists.mockReturnValue(Promise.resolve(true));
  fs.readJson.mockReturnValue({ environments: [{ name: "dev", url: "https://dev.environment.com" }] });

  await expect(new CommandsExecutionContext("/occ-tools-home/commands-execution-context.json").load()).rejects.toThrow(
    "Cannot load commands execution context. Missing project from context data."
  );
});

it("should throw error if environment ID is missing from context data", async () => {
  fs.exists.mockReturnValue(Promise.resolve(true));
  fs.readJson.mockReturnValue({
    project: "my-project",
  });
  getProjectsRegistry().getRegisteredProjects.mockReturnValue([{ id: "my-project", descriptor: { environments: [] } }]);

  await expect(new CommandsExecutionContext("/occ-tools-home/commands-execution-context.json").load()).rejects.toThrow(
    "Cannot load commands execution context. Missing environment from context data."
  );
});

// it("should throw error if project ID on context data points to a project that's not registered", async () => {
//   fs.exists.mockReturnValue(Promise.resolve(true))
//   fs.readJson.mockReturnValue({
//     project: 'my-project',
//     environment: 'dev',
//   })
//   getProjectsRegistry().getRegisteredProjects.mockReturnValue([])

//   await expect(new CommandsExecutionContext('/occ-tools-home/commands-execution-context.json').load()).rejects.toThrow(
//     'Cannot load commands execution context. Project "my-project" is not registered.'
//   )
// })

// it("should throw error if environment ID on context data points to an env that's not defined on the project", async () => {
//   fs.exists.mockReturnValue(Promise.resolve(true))
//   fs.readJson.mockReturnValue({
//     project: 'my-project',
//     environment: 'qa',
//   })
//   getRegisteredProjects.mockReturnValue([
//     { id: 'my-project', descriptor: { environments: [{ name: 'dev', url: 'https://dev.environment.com' }] } },
//   ])

//   await expect(new CommandsExecutionContext('/occ-tools-home/commands-execution-context.json').load()).rejects.toThrow(
//     'Cannot load commands execution context. Environment "qa" is not defined for project "my-project".'
//   )
// })

// it('should load the execution context properly', async () => {
//   fs.exists.mockReturnValue(Promise.resolve(true))
//   fs.readJson.mockReturnValue({
//     project: 'my-project',
//     environment: 'dev',
//   })
//   getRegisteredProjects.mockReturnValue([
//     { id: 'my-project', descriptor: { environments: [{ name: 'dev', url: 'https://dev.environment.com' }] } },
//   ])

//   const executionContext = new CommandsExecutionContext('/occ-tools-home/commands-execution-context.json')

//   await executionContext.load()
//   const currentContext = executionContext.get()

//   expect(currentContext.project.id).toBe('my-project')
//   expect(currentContext.environment.name).toBe('dev')
// })
