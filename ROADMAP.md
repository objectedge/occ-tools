# Roadmap version 3.x

There's still a lot of work to do to consider this version stable enough to move into a beta stage. Here's the list with a high-level overview of
these tasks:

## Signage

:grimacing: TODO
:thinking: In Progress
:sunglasses: Done

## Tasks

- [ ] :thinking: Command: widget upload
- [ ] :grimacing: Command: app-level js upload
- [ ] :grimacing: Command: list app-level js
- [ ] :grimacing: Command: download search configs
- [ ] :grimacing: Command: upload search configs
- [ ] :grimacing: Command: trigger search reindex
- [ ] :grimacing: Command: query search index status
- [ ] :grimacing: Command: list stacks
- [ ] :grimacing: Command: upload stack
- [ ] :grimacing: Command: download stack
- [ ] :grimacing: Change settings (mfa, credentials) for a particular project's environment
- [ ] :grimacing: Add unit tests
- [ ] :grimacing: A site to host documentation and other resources (using gh-pages)
- [ ] :grimacing: Documentation: User guide
- [ ] :grimacing: Documentation: Developer guide
- [ ] :grimacing: Testing on Windows
- [ ] :grimacing: Testing on MacOS

There are some features from 2.x that won't be part of the 3.x branch. I think the app is getting bloated because it's trying to do everything. The idea is to make this to follow more the UNIX philosophy: "Make each program do one thing well. To do a new job, build afresh rather than complicate old programs by adding new 'features'". So the objective OCC Tools is trying to achieve is to make easier to interact with the OCC environment. Anything beyond that should not be part of this tool. This is the list I believe should not be included:

1. Code transpilation to the ES6 version (widgets, app-level js)

We developed a way to write code for some elements like widgets using ES2015+ syntax and also using ES modules, and this gets transpiled into the normal, ES5 version with AMD expected by OCC. The problem is that at this phase you are not really interacting with OCC, this is more part of your development setup. Also, this leads to more problems and complications on the OCC Tools code. Instead, the idea here is to move these kind of setup to the project itself, so how you organize your code won't matter for OCC Tools, you only need to make sure to provide the final widget code and structure so that the tools can upload this to the environment.

2. Code generators, a.k.a. the "generate" commands (widgets, themes, elements, SSEs, etc)
Same case here as the above. I think for this we can create custom Yeoman generators.

3. Proxy
I think this tries to solve a different problem than OCC Tools itself, which is to make possible have a local development on OCC, so today you can start proxy using OCC Tools and this is more as a convenience to have everything on the same app, but following the UNIX philosophy this means this should be a separate application.

4. Deployment-related commands ("generate deploy" and "deploy" commands)
Same case of proxy. The way the version 3.x was built is to use as either a CLI application or use it programatically by including it as a dependency, so we can create a separate app for this and use the OCC Tools API to avoid reimplementing some stuff.

5. Auto update
6. Binaries for the app

The idea for version 3.x is to publish on NPM so this means that this won't be necessary anymore.
