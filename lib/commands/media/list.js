const Table = require("../../cli/ui/output/Table");
const colors = require("../../cli/ui/theme");
const Spinner = require("../../cli/ui/output/Spinner");
const OccApiType = require("../../api/occ-client/OccApiType");
const AssetTypes = require("../../api/media/AssetTypes");
const TextOutput = require("../../cli/ui/output/TextOutput");
const MediaFolders = require("../../api/media/MediaFolders");

const { formatBytes } = require("../../utils/format");
const { getMediaFilesInfo } = require("../../api/media");
const { Command, CommandOption } = require("../../cli/command");
const { getOccClientForCurrentEnv } = require("../../cli/occ");

class ListMediaFilesCommand extends Command {
  async execute(options = {}) {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const settings = {
        mediaFolder: options.mediaFolder || MediaFolders.GENERAL,
        assetType: options.entryType || AssetTypes.ALL,
        pageNumber: options.pageNumber || 1,
        itemsPerPage: options.itemsPerPage || 10,
      };

      if (options.searchTerm) {
        settings.searchTerm = options.searchTerm;
      }

      if (options.sortBy) {
        settings.sortBy = options.sortBy;
      }

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const { files, total } = await getMediaFilesInfo(occClient, settings);

      Spinner.hide();

      TextOutput.show(`${total} files found on the "${settings.mediaFolder}" folder. Showing ${files.length} files:`);
      new Table(
        ["Entry Type", "Path", "Size", "Last Modified", "Checksum"],
        files.map((f) => [
          f.type,
          f.path,
          f.type === "file" ? formatBytes(f.size) : "-",
          f.lastModified ? new Date(f.lastModified).toLocaleString() : "-",
          f.checksum || "-",
        ])
      ).show();
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot list media files. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "list",
      description: "List files on OCC media",
      options: [
        new CommandOption({
          name: "media-folder",
          shortName: "f",
          description: "List files only from a specific folder. All files will be returned by default.",
          autocomplete: async () => Object.values(MediaFolders).map((f) => ({ value: f, label: "Media Folder" })),
          validator(value) {
            if (!Object.values(MediaFolders).includes(value)) {
              throw new Error(`Invalid media folder "${value}".`);
            }
          },
        }),
        new CommandOption({
          name: "entry-type",
          shortName: "t",
          description: 'List files only from a type. It can be either "all" (default), "file" or "folder".',
          autocomplete: async () => Object.values(AssetTypes).map((t) => ({ value: t, label: "Asset Type" })),
          validator(value) {
            if (!Object.values(AssetTypes).includes(value)) {
              throw new Error(`Invalid entry type "${value}".`);
            }
          },
        }),
        new CommandOption({
          name: "page-number",
          shortName: "p",
          description: "Change the results page. Defaults to the first page.",
        }),
        new CommandOption({
          name: "items-per-page",
          shortName: "l",
          description: "Change the number of results per page (max 250). Defaults to 10 items.",
        }),
        new CommandOption({
          name: "search-term",
          shortName: "s",
          description: "Return only entries that match a specific term.",
        }),
        new CommandOption({
          name: "sort-by",
          shortName: "o",
          description: "A sort directive in the form: field:direction where direction is asc or desc.",
        }),
      ],
    };
  }
}

module.exports = ListMediaFilesCommand;
