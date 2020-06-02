const { join, basename } = require("path");
const { exists, readJson, outputJson } = require("fs-extra");

const { getHomePath } = require("../settings");
const { getProjectFolderStructure } = require("./folder-structure");
const { getProjectDescriptor, validateOccProject } = require(".");

let _projectsRegistry = null;

async function _persistRegistryRecords(registryFilePath, registeredProjects) {
  await outputJson(
    registryFilePath,
    registeredProjects.map((d) => ({ id: d.id, path: d.path }))
  );
}

class ProjectsRegistry {
  constructor(registryFilePath) {
    this._initialized = false;
    this._registeredProjects = new Map();
    this._registryFilePath = registryFilePath;
  }

  async init() {
    if (!this._initialized) {
      try {
        this._initialized = true;

        if (await exists(this._registryFilePath)) {
          const projectsData = await readJson(this._registryFilePath);

          for (const projectData of projectsData) {
            const descriptor = await getProjectDescriptor(projectData.path);
            const folderStructure = await getProjectFolderStructure(projectData.path);

            this._registeredProjects.set(projectData.id, {
              descriptor,
              folderStructure,
              ...projectData,
            });
          }
        } else {
          await _persistRegistryRecords(this._registryFilePath, []);
        }
      } catch (e) {
        this._initialized = false;
        throw new Error(`Cannot load projects. ${e.message}`);
      }
    }
  }

  getRegisteredProject(projectId) {
    return this._registeredProjects.get(projectId);
  }

  getRegisteredProjects() {
    return Array.from(this._registeredProjects.values());
  }

  isProjectRegistered(projectId) {
    return this._registeredProjects.has(projectId);
  }

  async registerProject(projectFolderPath) {
    await validateOccProject(projectFolderPath);

    const projectId = basename(projectFolderPath);
    const projectDescriptor = await getProjectDescriptor(projectFolderPath);

    if (this.isProjectRegistered(projectId)) {
      throw new Error(`Project already registered.`);
    }

    const folderStructure = await getProjectFolderStructure(projectFolderPath);

    this._registeredProjects.set(projectId, {
      id: projectId,
      descriptor: projectDescriptor,
      path: projectFolderPath,
      folderStructure,
    });

    await _persistRegistryRecords(this._registryFilePath, this.getRegisteredProjects());
  }

  async unregisterProject(projectId) {
    if (!this.isProjectRegistered(projectId)) {
      throw new Error("Project not registered.");
    }

    this._registeredProjects.delete(projectId);
    await _persistRegistryRecords(this._registryFilePath, this.getRegisteredProjects());
  }
}

function getProjectsRegistry() {
  if (!_projectsRegistry) {
    _projectsRegistry = new ProjectsRegistry(join(getHomePath(), "projects.json"));
  }

  return _projectsRegistry;
}

module.exports = {
  ProjectsRegistry,
  getProjectsRegistry,
};
