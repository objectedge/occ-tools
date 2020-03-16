const fs = require('fs-extra');
const path = require('path');
const util = require('util');
const less = require('less');
const winston = require('winston');
const chokidar = require('chokidar');
const glob = util.promisify(require('glob'));
const config = require('../config');
const Bundler = require('../bundler');

class Transpiler {
  constructor({ serverOptions, instanceOptions, localFiles }) {
    this.serverOptions = serverOptions;
    this.instanceOptions = instanceOptions;
    this.localFiles = localFiles;
    this.bundler = new Bundler({
      source: '/js',
      debug: true,
      dest: '/js',
      watch: true,
      polling: false,
      sourceMapType: '#eval-source-map',
      widgets: false,
      appLevel: true
    });
  }

  less() {
    return new Promise(async (resolve, reject) => {
      let widgetsLessFiles, themeLessFiles;
      const lessPath = path.join(config.dir.transpiled, "less");
      const commonCSSOutputPath = path.join(lessPath, "common.css");
      const themeCSSOutputPath = path.join(lessPath, "base.css");

      const bootstrapPath = path.join(
        require.resolve('less'),
        '..',
        '..',
        "occ-custom-bootstrap-less",
        "less",
        "bootstrap.less"
      );

      try {
        await fs.ensureDir(lessPath);
        widgetsLessFiles = await glob(path.join(config.dir.project_root, 'widgets', '**', 'widget.less'));
        themeLessFiles = await glob(path.join(config.dir.project_root, 'less', '**', '*.less'));
      } catch (error) {
        return reject(error);
      }

      const importWidgetsLessFiles = widgetsLessFiles
        .map(lessFile => `@import "${lessFile}";`)
        .join("");
      const importThemeLessFiles = themeLessFiles
        .map(lessFile => `@import "${lessFile}";`)
        .join("");

      const commonLessSource = () => {
        let lessSourceToRender = "";
        lessSourceToRender += `/*__local_css_delete__*/@import "${bootstrapPath}";/*__proxy_delete_end__*/`;
        lessSourceToRender += importWidgetsLessFiles;
        lessSourceToRender += `/*__local_css_delete__*/${importThemeLessFiles}/*__proxy_delete_end__*/`;
        return lessSourceToRender;
      };

      const themeLessSource = () => {
        let lessSourceToRender = "";
        lessSourceToRender += `/*__local_css_delete__*/@import "${bootstrapPath}";/*__proxy_delete_end__*/`;
        lessSourceToRender += `${importThemeLessFiles}`;
        return lessSourceToRender;
      };

      const generateCSS = ({
        lessSourceToRender,
        outputFile,
        changedFile,
        type
      }) => {
        return new Promise(async (resolve, reject) => {
          winston.info(`processing less files for the "${type}"`);
          if (changedFile) {
            winston.wait(`processing less file ${changedFile}`);
          }
          try {
            const rendered = await less.render(lessSourceToRender);
            let code = rendered.css;
            code = code.replace(
              /\/\*__local_css_delete__\*\/[^]+?\/\*__proxy_delete_end__\*\//gm,
              ""
            );
            await fs.writeFile(outputFile, code);
            winston.info(`${type}'s less processed`);
            winston.info(`${type}'s file saved at: ${outputFile}`);
            resolve();
          } catch (error) {
            winston.error("error on less process");
            winston.error(error);
            reject(error);
          }
        });
      };

      try {
        await generateCSS({
          lessSourceToRender: commonLessSource(),
          outputFile: commonCSSOutputPath,
          type: "widgets"
        });
        await generateCSS({
          lessSourceToRender: themeLessSource(),
          outputFile: themeCSSOutputPath,
          type: "theme"
        });
      } catch (error) {}

      this.lessWatcher = chokidar.watch(widgetsLessFiles);
      winston.info("Watching for less changes...");

      this.lessWatcher.on("change", changedFile => {
        winston.info(`Detect changes on ${changedFile}...`);
        const isThemeFile = !/widgets/.test(changedFile);
        const options = {
          lessSourceToRender: isThemeFile
            ? themeLessSource()
            : commonLessSource(),
          outputFile: isThemeFile ? themeCSSOutputPath : commonCSSOutputPath,
          type: isThemeFile ? "theme" : "widgets",
          changedFile
        };

        generateCSS(options);
      });

      resolve();
    });
  }

  js() {
    return new Promise((resolve, reject) => {
      let resolved = false;
      winston.info('[bundler:compile] Bundling javascript files..');

      this.bundler.on('complete', async stats => {
        winston.info('\n\n')
        winston.info('[bundler:compile] Changes ----- %s ----- \n', new Date());
        winston.info('[bundler:compile] %s', stats.toString('minimal'));

        if(!resolved) {
          setTimeout(() => {
            resolve();
            resolved = true;
          }, 1000);
        }
      })
      this.bundler.on('error', error => {
        winston.error('[bundler:error]', error);
        reject(error);
      });

      this.bundler.compile();
    });
  }
}

module.exports = Transpiler;
