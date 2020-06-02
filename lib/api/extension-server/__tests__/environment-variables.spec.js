const { setVariable, removeVariable } = require("../environment-variables");

const occClient = {
  listExtensionVariable: jest.fn(),
  doGetExtensionVariable: jest.fn(),
  doUpdateExtensionVariable: jest.fn(),
  doCreateExtensionVariable: jest.fn(),
  doDeleteExtensionVariable: jest.fn(),
};

beforeEach(() => {
  occClient.listExtensionVariable.mockReset();
  occClient.doGetExtensionVariable.mockReset();
  occClient.doUpdateExtensionVariable.mockReset();
  occClient.doCreateExtensionVariable.mockReset();
  occClient.doDeleteExtensionVariable.mockReset();
});

it("should create variable if it doesn't exist", async () => {
  occClient.listExtensionVariable.mockReturnValue({ items: [] });
  await setVariable(occClient, "my-custom-variable", "testing123");

  expect(occClient.doCreateExtensionVariable).toBeCalled();
  expect(occClient.doUpdateExtensionVariable).not.toBeCalled();
});

it("should update variable if it already exists", async () => {
  occClient.listExtensionVariable.mockReturnValue({ items: [{ name: "my-custom-variable", value: "tested456" }] });
  await setVariable(occClient, "my-custom-variable", "testing123");

  expect(occClient.doUpdateExtensionVariable).toBeCalled();
  expect(occClient.doCreateExtensionVariable).not.toBeCalled();
});

it("should throw error if tries to delete a variable that doesn't exist", async () => {
  occClient.doGetExtensionVariable.mockRejectedValue(new Error("OCC Error 100319: Extension Variable does not exist."));

  expect.assertions(1);
  await expect(removeVariable(occClient, "inexistent-variable")).rejects.toThrow(
    "OCC Error 100319: Extension Variable does not exist."
  );
});
