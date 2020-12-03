# Change Log
All notable changes to occ-tools will be documented in this file.
This project must adhere to [this](https://github.com/olivierlacan/keep-a-changelog/blob/master/CHANGELOG.md) format.

## [2.0.0-beta.38] - 2020-12-03]
### Fixed
- Errors on the authentication and no logs were being displayed
- Option to switch between MFA LOGIN and APPLICATION KEY was not working properly

### ADDED
- Option to pass the `--totp-code` in the command, e.g: occ-tools --totp-code=123456 upload sse oeUserSyncConnector. This option will force the login to use MFA LOGIN instead application key
- Option to pass the `--use-app-key` in the command, e.g: occ-tools --use-app-key upload sse oeUserSyncConnector. This option will force to login with Application Key instead of MFA LOGIN

## [2.0.0-beta.37] - 2020-12-02]
### Add
- Support to login with Application Key

## [2.0.0-beta.36] - 2020-12-01]
### Fixed
- Reverting changes on the Proxy Pac File ip
- Adding restriction to only proxy success response status code for the HTML. It was throwing the EPIPE issue

## [2.0.0-beta.35] - 2020-11-30]
### Fixed
- Changed Proxy Pac domain from local host to current machine ip.
- Error EPIPE Issue on Proxy

## [2.0.0-beta.34] - 2020-11-12]
### Added
- New options to upload sse command:
  - --names(-n) = A list of SSEs to be deployed. Separated by comma
  - --npm(-i) = Flag that indicates if the SSE Node Module should be installed. It will remove the node_modules folder and run npm install --only=prod
  - --all(-a) = Upload all SSEs available locally
  - --times(-t) = The amount of times the occ-tools should try before stopping the upload action
  - --delay(-d) = The delay to try again between the upload attempts
  - --skip(-s) = SSEs those should be excluded from the Upload action. This should be a list of SSE's names separated by comma.
### Fixed
- The upload command for the SSE will always check if the SSE server is up before trying to make the call to the server. It will check if the server is up, if it's not, then it will try check again until it reaches the max attempts defined in the --times option.

## [2.0.0-beta.33] - 2020-11-04]
### Fixed
- OCI env name support

## [2.0.0-beta.32] - 2020-10-22]
### Added
- Logs for app level bundler

## [2.0.0-beta.29] - 2020-08-26]
### Fixed
- Proxy Slowness

## [2.0.0-beta.25] - 2019-12-10]
### Added
- Remove the sse-name parameter from the download sse logs command.
- Add a path option to download sse-logs command.
### Fixed
- Change download sse-logs command to deal with a zip file instead of a JSON response.

## [2.0.0-beta.24] - 2019-12-10]
### Fixed
- Fixing a typo on the SSE generation command
- Prevent the HTML loader to strip comments from the template files

## [2.0.0-beta.23] - 2019-11-29]
### Fixed
- Fixed issue in the Proxy due the NODEJS HTTP PARSER changes, ref: https://github.com/nodejs/node/issues/27711, https://github.com/sam-github/node/commit/576b7f4b837e50411a0c73f6af8f7bdad0a961c9, https://www.npmjs.com/package/http-parser-js

## [2.0.0-beta.23] - 2019-11-21]
### Added
- Allow ES6 widgets to define a template for a KO component as a separate HTML file.
### Fixed
- Issue with the james-proxy/james-browser-launcher. It was not opening the browser anymore properly, changed to @httptoolkit/browser-launcher.
- Use storefront configurable dir on generate deploy command.

## [2.0.0-beta.22] - 2019-04-24]
### Added
- New commands to manage server-side variables (list, download, upload, delete);
  - Upload and Delete server-side variables also are on deploy command;
- Added option to download Commerce Cloud SDK when generating a Server-Side Extension;
- Added a helper on the Server-Side extension boilerplate to get configs and variables;
- New command to restart Server-Side extension server (also on deploy command);
- New option to trigger index command to do a Baseline Full Export search index
- Added option to delete third-party folders on delete files command
- [EXPERIMENTAL] Added a command to generate a deploy script with the changes since a commit ID or tag/release
- Added token refresh feature during a command execution to avoid MFA token expiration
  - Deploy command first logs in on all APIs and then starts the command execution
- Options to the browser command
  - `config` option to display the current browser configs
  - `config --default` to set the default browser
- New log in the proxy browser initialization, now, when the proxy starts a better browser is displayed such as Browser Version, current IP, proxy PAC URL.
- New validation in the current commands to check if the user is allowed to run a command based on the env and branch. The `branch` information is set inside the `occ-tools.project.json`
- New info being added during widget upload:
  - Timestamp for the last uploaded time;
  - Hash from the current commit;
  - Flag that indicates if there are unstaged changes in Git.
- The info is being added through JS inside widgetInfo object, and displayed in the template as comments;
- Integration with Bugsnag, to track errors;
    - Calling module from occ-tools.js;
- New flag to the trigger email command to define the siteId in which the operation will run;
- Usage:
    - trigger email [emailId] -m [mailTo] -s [siteId] -d [emailData] or
    - trigger email [emailId] --mailTo [mailTo] --siteId [siteId] --data [emailData]

- New flag to the [list] email command to define the siteId in which the operation will run;
- Usage:
    - list email [emailId] -s [siteId] or
    - list email [emailId] --siteId [siteId]
- Related tasks: [OT-39]

### Fixed
- Fixed cache problem when uploading email templates
- Fixed error displaying when creating the config.json on the first time
- Improved some error messages when login fails
- Display error message when delete file fails
- Avoid to call delete files API id there is no file to be deleted
- Fixed upload file on deploy command
- Fixed browser local IP
- Fixed Locale upload
- The upgrade command now uploads 'template' in addition to 'less'. This is so the updated version info
is still shown when the user upgrades after changing something in the widget.
- The --enabled flag of list email command was returning an empty list. The property name was changed to fix that.

## [2.0.0-beta.21] - 2018-11-13]
### Fixed
- Fixed template upload for global widgets

## [2.0.0-beta.20] - 2018-11-12]
### Fixed
- LESS update on widget upload command

## [2.0.0-beta.19] - 2018-11-12]
### Added
- Generate widget from an OCC OOTB
  - https://github.com/objectedge/occ-tools/wiki/Generate-Widget
- New command compile email
  - This command compiles an email template and optionally sends it, without using OCC for this
  - Also allows creating reusable templates and functions to be used on emails
    - Upload email also support this feature 
  - https://github.com/objectedge/occ-tools/wiki/Compile-Email
  - For more information about the template engine used by OCC, see https://freemarker.apache.org/
- Added option to upload an email template on deploy command 
  - https://github.com/objectedge/occ-tools/wiki/Deploy-Command
- New commands to upload, delete and download response filters
  - Donwload: https://github.com/objectedge/occ-tools/wiki/Download-Response-Filters
  - Upload: https://github.com/objectedge/occ-tools/wiki/Upload-Response-Filters
  - Delete: https://github.com/objectedge/occ-tools/wiki/Delete-Response-Filters
  - OCC Docs: https://docs.oracle.com/cd/E97801_01/Cloud.18C/WidgetDev/html/s0801filterrestresponses01.html
- Download server-side extensions logs by date
  - https://github.com/objectedge/occ-tools/wiki/Download-Server-Side-Extension-Logs
- Widget upload now supports locale updates
 - By default, the command upload all locale resources, but you can specify which ones you want to upload
 - https://github.com/objectedge/occ-tools/wiki/Upload-Widgets
- Widget upload now supports uploading base less and template
- Stacks upload: upload multiple stacks, if they have the same name

### Fixed
- Download server-side extensions logs:
  - Display error message when the options are invalid
  - Download logs when OCC have multiple SSE instances
- Fixed typo on locale option of trigger email template (local -> locale)
- Improvements on widget upload performance
  - Some calls are made parallel now
  - OCC now provides a REST API to update the less and template for all instances
 
### Removed
- Removed a logging option that was generating a '-tools.log' file when some error occurred

## [2.0.0-beta.18] - 2018-10-15]
### Fixed
- Fixed proxy issue with set-cookies

## [2.0.0-beta.17] - 2018-10-08]
### Added
- Added support to uglify app-level
- Added command to execute multiple occ-tools actions (deploy)
- Added verbose option on main command
  - When verbose option is active will log OCC requests and responses
  - ES6 compilation logs will be only displayed when verbose option is active
- Added command to trigger publish
- Added command to check last publish status
- Added command to build theme
- There is no need to be inside storefront folder to execute the commands

### Fixed
- Fixed duplicated min vendor file inside app-level folder
- Fixed proxy with incapsula calls
- Fixed LESS problem when upgrading widgets
- Fixed restore configurations when upgrading widgets
- Fixed download theme command
- Fixed download widget command
- Fixed global option when generating widget
- Fixed multiple typos on commands help and improved log messages

## [2.0.0-beta.16] - 2018-07-24]
### Fixed
- Fixed backslash on upgrade and generate for app-level for Windows
- Fixed api call on emails

## [2.0.0-beta.15] - 2018-07-23]
### Fixed
- All paths to apis. There was an issue in some features where the `path.join` was being used instead of `util.format` to build apis urls. Due to this, the URLs were being built wrongly for Windows. 
- Issue when Hologram is not installed. Now the Hologram is optional.

## [2.0.0-beta.14.1] - 2018-07-16]
### Added
- Add commands to list, upload, download, and delete files
  - Image commands could be considered deprecated
  - Upload, download, and delete allow glob patterns (one or multiple files at once)
  - Ability to upload, download, and delete to another OCC folders (including thirdparty folder)
  - Upload and download in parallel
- Backup/Restore multi-site
  - Add support to app-level, config, gateway, widget multi-site associations backup and restore
  - Store a backup on a temp file while upgrading app-level, config, gateway, widget
  - Add command to restore app-level, config, gateway, widget from a backup file
  - Add command to list app-levels
  - Add command to update app-levels (there is no need to upgrade the app-level)
- GitHub token login
  - Support to github token login
- Generate extension button on proxy panel
  - Option to just generate the extension and save it locally. The same as occ-tools generate extension
### Fixed
- Fix upgrade widget inside stacks
  - When widgets are inside of a stack they are not directly added on the structure, they are like region inside the regions, so the method to restore is recursively 
    looking for widgets for regions inside regions.
- Issue on save mocks status change and edit mock content
### Changed
- Changed the behavior of the save as mock. Now it will save with the `enable` and `isAbsolute` set to `false` and the filePath will be relative to the project.
- Changed the behavior of the `extraRoutes` to support both `filePath` and `process` options together and the context of the `process` function will be the same as the route. 

## [2.0.0-beta.13] - 2018-06-19
### Fixed
- Issue regarding to real-time cache update on proxy panel
- Filter not working on Widgets and Mocks tab

## [2.0.0-beta.12] - 2018-06-18
### Added
- 'output' option to 'generate extension' method
- Commands to list, download, and upload stacks
- Option to save any cache as Mock
- Option to edit any cache in real time using the JSON Editor or Code Mirror library
- Option to edit any Mock in real time using JSON Editor or Code Mirror library
- Option to enable and disable Mock request
- Created some routes on Socket.io to get the proxy panel data
### Fixed
- Fix when a site settings or gateway is upgraded by the first time
- Issue on Socket.io. The Socket.io was not connecting from time to time due to a bad implementation.
- Fixed issues related to cache use on proxy.
### Changed
- Improved the occ-tools proxy panel, reording the table and adding some filters.

## [2.0.0-beta.11] - 2018-05-23
### Fixed
- Extension generation issue 

## [2.0.0-beta.10] - 2018-05-21
### Added
- Commands to trigger, list, download and upload emails
# Fixed
- Issues on server side extensions 

## [2.0.0-beta.9] - 2018-04-20
### Fixed
- Browser for development issues
- Cross platform issues

## [2.0.0-beta.8] - 2018-04-11
### Fixed
- Fixed login issues
- Fixed request json parser error
### Added
- Option to login with Multi-Factor Authentication(MFA)
- Option to set the Time-based One-Time Password(totp code)
- Option the reset the login token

## [2.0.0-beta.7] - 2018-04-11
### Fixed
- Fixing theme issue

## [2.0.0-beta.6] - 2018-04-11
### Fixed
- Removing debug code

## [2.0.0-beta.5] - 2018-04-10
### Fixed
- disabling upload elements
- fixing proxy theme issue
- removing ssh and changing github credentials to be required
### Added
- Set storefront path for projects with multi site

## [2.0.0-beta.4] - 2018-03-08
### Fixed
- Theme generation

### Added
- Force update

## [2.0.0-beta.3] - 2018-03-07
### Fixed
- Error on file occ-tools configs file creation

## [2.0.0-beta.2] - 2018-03-07
### Fixed
- Proxy files reload
- Configs prompt color

## [2.0.0-beta.1] - 2018-03-05
### Added
- Option to manage project change. It's possible to change the project, set env credentials, github credentials.
  - Available options:
    init            Initiate a new occ-tools configuration
    set-projects-path  Set the OCC base projects path, where all your OCC projects are placed at
    set-project     Set an OCC Project
    set-env         Set an OCC Project Environment
    set-env-credentials
    set-github      Set Github Credentials
    configs-path    Location of occ-tools configurations file
    
- No dependency with occ-tools-gui.

## [2.0.0-alpha.14] - 2018-03-05
### Changed
- Removed the Electron dependency and added new Node.js compiler [Node Packer](https://github.com/douglashipolito/node-packer), which decreased the build size, build time process and the occ-tools execution. With that, a new auto-update was implemented for all platforms, that grabs the latest version from github and auto-update itself.

## [2.0.0-alpha.13] - 2018-02-27
### Added
- command to generate site settings
- command to generate payment gateway settings
- app-level generation feature
- server side extensions operations
- command to generate server side extensions
- command to download sse logs
- Upgrade Command - Refactor & Backup/Restore widget instances
- ability to pass the locales through proxy
- option to create commands without sub-commands
- new option to allow extra routes 

### Fixed
- reduce parallel calls on upload widget

## [2.0.0-alpha.12] - 2018-02-05
### Added
- New option to allow users to add their custom commands to occ-tools
- Widgets overlay view to proxy
- noLess option on proxy
- Http auth option and removing the yellow alert bar about using some chrome flags

## [2.0.0-alpha.11] - 2017-12-11
### Fixed
- Issue on widgets loading on proxy. When no ES6 widgets was present, the proxy wasn't starting.
- Issue related to the Refresh Token when not on the Store Env. A JSON parse token was thrown.
- Extension Generation, in the newer OCC versions, the pattern for the extension date creation is different than we used to have. It doesn't require the time, only the date.

#Added
- new `oe` namespace on browser. Now, some proxy, occ and widgets details can be accessed by typing `oe.occ`, `oe.tools`, `oe.widgets` inside the Chrome Browser at console tab. Inside each object, there will be some occ details, like occ version, inside tools there will be the occ-tools version, the occ-tools path and inside the widget, there will be all widgets and their details. Each widget can be activated by oe.widgets.[widgetname].activate(). For example, oe.widgets.oeHeader.activate().
- impex import/export
- Trigger search index

## [2.0.0-alpha.10] - 2017-12-10
### Added
- Support to elements on Proxy

## [2.0.0-alpha.9] - 2017-12-05
### Fixed
- Issue on the less watches:
  - the widgets's less was being duplicated every change.
  - there was a well-known issue on the theme, the browser was crashing after some less changes.

## [2.0.0-alpha.8] - 2017-12-04
### Fixed
- Issue on ES6 widgets count on proxy. It was preventing the whole proxy flow to be ran.

## [2.0.0-alpha.7] - 2017-12-04
### Added
- Command `version` to show the current occ-tools version
### Fixed
- Issue on ES6 proxy performance. It was too slow to bundle the widgets.

## [2.0.0-alpha.6] - 2017-11-09
### Added
- Support to app-level on proxy
### Fixed
- Fixed generate theme issue

## [2.0.0-alpha.5] - 2017-10-18
### Added
- Support to elements

## [2.0.0-alpha.4] - 2017-06-04
### Fixed
- Webpack externals regex pattern

## [2.0.0-alpha.3] - 2017-06-27
### Added
- New minify option that creates a source map

## [2.0.0-alpha.2] - 2017-06-20
### Removed
- Removed Remote Debugger from proxy

## [1.15.5] - 2017-03-16
### Added
- Adding timestamp to js files

## [1.15.4] - 2017-02-20
### Added
- Adding source map options and fixing the .map file uploader

## [1.15.3] - 2017-02-15
### Added
- Changed webpack sourcemap option to eval source map

## [1.15.2] - 2017-01-03
### Fixed
- Issue on widget download

## [1.15.1] - 2016-12-29
### Fixed
- Issue on ES6 source map

## [1.15.0] - 2016-12-28
### Added
- Included feature to detect a minified js file and upload it to occ

## [1.14.10] - 2016-12-27
### Fixed
- Fixing modules versions

## [1.14.9] - 2016-12-27
### Fixed
- Issue related to how uglify was dealing with the compression.

## [1.14.8] - 2016-12-27
### Fixed
- Issue related to the app-level and vendors. The vendors has to be treated in a diffent way than others libraries.

## [1.14.7] - 2016-12-21
### Fixed
- Issue on generating theme regarding to style.css

## [1.14.6] - 2016-12-19
### Fixed
- Issue on proxying the js map

## [1.14.5] - 2016-12-19
### Added
- Ignoring widgetMeta on extension generation

## [1.14.4] - 2016-12-15
### Added
- Changed the app level generator to support ES6

## [1.14.3] - 2016-12-14
### Fixed
- Issue related to multiples folders inside app level when generating the extension

## [1.14.2] - 2016-12-14
### Added
- Improved the APP Level generation to bundle all js files into one

## [1.14.1] - 2016-12-09
### Added
- Added a simple log alerting the dev that he has to upload the widgets

## [1.14.0] - 2016-12-09
### Added
- Defined --disableCache option as default with the value /ccstoreui/v1

## [1.13.1] - 2016-12-05
### Fixed
- Fixed App Level application path on proxy

## [1.13.0] - 2016-12-05
### Added
- App Level extension generator option

## [1.12.4] - 2016-12-02
### Fixed
- Issue on generating widget related to a RegExp on getWidgetFilePath method

## [1.12.3] - 2016-11-29
### Fixed
- Solved issue related to widgets without widget.json file

## [1.12.2] - 2016-11-28
### Fixed
- Solved issue related to new es6 widget base on another

## [1.12.1] - 2016-11-28
### Fixed
- Solved issue on generating theme on OCC 16.5

## [1.12.0] - 2016-11-28
### Added
- Changed the bundler compile arguments and changed the webpack devtools to #source-map

## [1.11.3] - 2016-11-28
### Fixed
- Solved problem on occ-tools proxy panel methods
### Added
- Class properties on ES6 widgets

## [1.11.2] - 2016-11-03
### Fixed
- Solved the #data replace on proxy template

## [1.11.1] - 2016-11-03
### Fixed
- Solved the problem related to OCC 16.5 when detecting changes and replacing the template

## [1.11.0] - 2016-11-03
### Added
- Option to disable cache requests based on a list of regex expressions

## [1.10.0] - 2016-11-03
### Added
- Added [widgets] option on proxy to set which widgets should be started as active or all widgets using --widgets=*
### Fixed
- Solved the problem related to new OCC Version 16.5

## [1.9.0] - 2016-09-14
### Added
- Implemented the `download image` command.

## [1.8.0] - 2016-09-09
### Added
- New feature to test all widgets

## [1.7.0] - 2016-09-08
### Added
- New feature to generate widgets in ES6.
- New feature to generate widgets using another widget as a base(only ES6).
- Added a helper to deal with github requests.

## [1.6.2] - 2016-09-04
### Fixed
- Issue on knockout bindings using bundler

## [1.6.1] - 2016-09-02
### Fixed
- Issue on externalsPattern regex

## [1.6.0] - 2016-09-02
### Added
- Implemented the unminify option to upload the original to the .min.js file of widget

## [1.5.0] - 2016-09-01
### Added
- Bundler feature that allow us to merge all js files into one.

## [1.4.10] - 2016-09-17
### Fixed
- Support to generate theme on occ 16.5

## [1.4.9] - 2016-08-30
### Fixed
- Theme compiling

## [1.4.6] - 2016-08-25
### Fixed
- Adjusted proxy less render not to consider the variables.less when it doesn't exist

## [1.4.5] - 2016-08-25
### Fixed
- Adjusted proxy widget listing when we don't have widgetType on widget.json file

## [1.4.5] - 2016-08-24
### Fixed
- Adjusted hologram template header links

## [1.4.5] - 2016-08-24
### Fixed
- Adjusted occ proxy comments position

## [1.4.4] - 2016-08-24
### Fixed
- Adjusted less comments on proxy

## [1.4.3] - 2016-08-24
### Fixed
- Adjusted the hologram compiling on proxy

## [1.4.2] - 2016-08-24
### Fixed
- Adjusted the way of the less was being compiled on proxy

## [1.4.1] - 2016-08-23
### Fixed
- Adjusted the links on theme page when using proxy

## [1.4.0] - 2016-08-23
### Added
- Support to work with themes on Proxy Server

## [1.3.10] - 2016-08-11
### Fixed
- Fixed the problem of "Cannot read property 'displayName'" when an 'uncaughtException' is thrown and because of winston we can't see what happened.
- Fixed the problem with jquery not being found.

## [1.3.9] - 2016-08-11
### Fixed
- Replaced `winston.error` by `console.log`, to avoid the error "Cannot read property 'displayName' of undefined" on some situations.

## [1.3.8] - 2016-08-11
### Fixed
- Adjusted CSS path in spritesheet generation.

## [1.3.7] - 2016-08-08
### Fixed
- Issue on regex of templateString replace

## [1.3.6] - 2016-08-08
### Fixed
- Issue on proxyTemplate string, it wasn't updating other templates except display.template.

## [1.3.5] - 2016-08-05
### Fixed
- Issue on proxyTemplate string, it wasn't getting updated.

## [1.3.5] - 2016-08-05
### Fixed
- Issue on proxyTemplate string.. it was throwing an parse error when the template had some <script> tag.

## [1.3.4] - 2016-08-04
### Fixed
- Issue on occ admin caching when using proxy.

## [1.3.3] - 2016-08-04
### Added
- Improved the proxy performance by adding a new way to deal with widgets on each page.

## [1.3.2] - 2016-08-04
### Added
- Added the option to polling on proxy.

## [1.3.1] - 2016-08-03
### Added
- Fixed wrong completion event name on widget generation command.

## [1.3.0] - 2016-07-20
### Added
- Upload image command

## [1.2.3] - 2016-07-15
### Fixed
- Changed the event name from 'generate' to 'complete' in extension generation command

## [1.2.1] - 2016-07-07
### Fixed
- Dealing with Oracle changes on style.css file

## [1.2.1] - 2016-07-07
### Fixed
- jQuery was not being found when the remote debugger was active

## [1.2.0] - 2016-07-07
### Added
- Feature to hide the preview bar when developing locally using Proxy

## [1.1.1] - 2016-07-06
### Fixed
- Fix to deal with weird widgetsNames from oracle on OCC-PROXY

## [1.1.0] - 2016-07-05
### Added
- Feature to remove the occ's session expire behavior on OCC-PROXY

## [1.0.2] - 2016-06-17
### Changed
- Fixed noop when `-d` option is used in widget download
- Removed `-n` option on widget download command

## [1.0.1] - 2016-06-16
### Changed
- Removed duplicated code in theme generation

## [1.0.0] - 2016-06-15
### Added
- Command `generate spritesheet` to generate spritesheet.

### Changed
- Spritesheet generation added to styleguide process flow.

## [0.5.0] - 2016-05-11
### Added
- Now the widget generation command will use the templates defined in oeGenericWidget of occ-components repository instead local templates hardcoded in code.
- Added theme and styleguide generation.

## [0.4.0] - 2016-04-22
### Added
- In widget upload, added the `--minify|-m` option to minify the Javascript files before upload

### Changed
- Removed 'data' folder and migrated temp data to OS '/tmp' folder.
- Removed the option `--name|-n` from `upload`, `download` and `generate` commands.

## [0.3.0] - 2016-03-18
### Added
- App execution flow now is fully async.

## [0.2.0] - 2016-02-25
### Added
- Bash completion support.
- More information messages during command runtime;
- Config file for multiple environments (dev, qa, prod), and interchangeable by `env` command;
- Possibility to upload individual widget files instead entire widget. Run `occ-tools help upload widget` for more details.
- The option `--times` (short `-t`), that defines the times to repeat the upload.

### Changed
- Transformed in a bash executable, dispensing the use of `node` command before the script call.
- Refactored command map: Now it uses git-style commands and added a special `help` command that shows the help for each command;
- Using the new template for widget generator, using the boilerplate created in `oeGenericWidget` widget;
