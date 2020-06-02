const { tick, cross } = require("figures");

const Table = require("../../../cli/ui/output/Table");
const colors = require("../../../cli/ui/theme");
const Spinner = require("../../../cli/ui/output/Spinner");
const OccApiType = require("../../../api/occ-client/OccApiType");
const TextOutput = require("../../../cli/ui/output/TextOutput");

const { UiElementSource } = require("../../../api/design-studio");
const { Command, CommandOption } = require("../../../cli/command");
const { getOccClientForCurrentEnv } = require("../../../cli/occ");

const _yesNoValue = (val) => (val && colors.success(tick)) || colors.danger(cross);
const _formattedSource = (src) => {
  const source = Object.values(UiElementSource).find((e) => e.id === src);
  return (source && source.name) || "Unknown";
};

class ListWidgetsCommand extends Command {
  async execute(options = {}) {
    try {
      Spinner.setText("Gathering information...");
      Spinner.show();

      const occClient = await getOccClientForCurrentEnv(OccApiType.COMMERCE_ADMIN);
      const { items } = await occClient.getAllWidgetInstances();
      Spinner.hide();

      if (items.length) {
        let widgets = items;

        if (options.source) {
          const source = Object.values(UiElementSource).find((e) => e.id === options.source);
          widgets = widgets.filter((w) => w.source === source.id);
        }

        TextOutput.show(`${widgets.length} widgets found:`);
        new Table(
          ["ID", "Name", "Source", "Global", "Total Instances"],
          widgets.map((w) => [
            w.repositoryId,
            w.displayName,
            _formattedSource(w.source),
            _yesNoValue(w.global),
            w.instances.length,
          ])
        ).show();
      } else {
        TextOutput.show(`No widgets found.`);
      }
    } catch (e) {
      Spinner.hide();
      TextOutput.show(colors.danger(`Cannot list widgets. ${e.message}`));
    }
  }

  static get definition() {
    return {
      name: "list",
      description: "List all widgets",
      options: [
        new CommandOption({
          name: "source",
          shortName: "s",
          description: "Show only widgets from a particular source.",
          autocomplete: async () =>
            Object.values(UiElementSource).map((e) => ({
              value: e.id.toString(),
              label: e.id.toString(),
              description: e.name,
            })),
        }),
      ],
    };
  }
}

module.exports = ListWidgetsCommand;
