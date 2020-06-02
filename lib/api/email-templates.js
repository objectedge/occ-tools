const { join, parse } = require("path");
const { remove, emptyDir } = require("fs-extra");

const { uploadMediaFiles } = require("./media");
const { saveReadStreamIntoFile, unzipFile } = require("../utils/fs");

async function downloadEmailTemplate(occClient, emailTemplateId, destinationFolderPath, options = {}) {
  const fileReadStream = await occClient.downloadEmailTemplates(emailTemplateId, {
    options: { occsite: options.siteId || "siteUS" },
    responseType: "stream",
  });
  const zipFilePath = join(destinationFolderPath, `${emailTemplateId}.zip`);
  const emailTemplateFolderPath = join(destinationFolderPath, emailTemplateId);

  await saveReadStreamIntoFile(fileReadStream, zipFilePath);
  await emptyDir(emailTemplateFolderPath);
  await unzipFile(zipFilePath, emailTemplateFolderPath);
  await remove(zipFilePath);
}

async function uploadEmailTemplate(occClient, emailTemplateId, zipFilePath, options = {}) {
  const fileName = `/notifications/uploads/${parse(zipFilePath).base}`;

  await uploadMediaFiles(occClient, [{ name: fileName, path: zipFilePath }]);
  const results = await occClient.updateEmailTemplates(emailTemplateId, {
    data: { filename: fileName },
    siteId: options.siteId,
  });

  return results;
}

module.exports = {
  downloadEmailTemplate,
  uploadEmailTemplate,
};
