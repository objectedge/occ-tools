const { join } = require("path");
const { exists, readJson, outputJson } = require("fs-extra");

const { getHomePath } = require("./settings");
const { getProjectsRegistry } = require("./project/registry");

let _executionContext = null;

class CommandsExecutionContext {
  constructor(contextFilePath) {
    this._loaded = false;
    this._contextFilePath = contextFilePath;
    this._currentContext = { project: null, environment: null };
  }

  get() {
    return this._currentContext;
  }

  async set(project, environment) {
    this._currentContext = { project, environment };
    await outputJson(this._contextFilePath, { project: project.id, environment: environment.name });
  }

  async init() {
    await outputJson(this._contextFilePath, {
      project: null,
      environment: null,
    });
  }

  async load() {
    if (!this._loaded) {
      try {
        this._loaded = true;

        if (await exists(this._contextFilePath)) {
          const contextData = await readJson(this._contextFilePath);

          if (!contextData.project) {
            throw new Error("Missing project from context data.");
          }

          if (!contextData.environment) {
            throw new Error("Missing environment from context data.");
          }

          const project = getProjectsRegistry()
            .getRegisteredProjects()
            .find((p) => p.id === contextData.project);

          if (!project) {
            throw new Error(`Project "${contextData.project}" is not registered.`);
          }

          const environment = project.descriptor.environments.find((e) => e.name === contextData.environment);

          if (!environment) {
            throw new Error(
              `Environment "${contextData.environment}" is not defined for project "${contextData.project}".`
            );
          }

          this._currentContext = { project, environment };
        } else {
          await outputJson(this._contextFilePath, this._currentContext);
        }
      } catch (e) {
        this._loaded = false;
        throw new Error(`Cannot load commands execution context. ${e.message}`);
      }
    }
  }
}

function executionContext() {
  if (!_executionContext) {
    _executionContext = new CommandsExecutionContext(join(getHomePath(), "commands-execution-context.json"));
  }

  return _executionContext;
}

module.exports = {
  CommandsExecutionContext,
  executionContext,
};
