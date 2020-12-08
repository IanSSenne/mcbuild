# THIS REPO HAS MOVED TO [HERE](https://github.com/mc-build/mc-build) AND WILL NOT BE MAINTAINED.
# FOR MORE INFO ABOUT MC-BUILD YOU CAN VISIT THE SITE [HERE](https://mcbuild.dev)

<img src="https://raw.githubusercontent.com/IanSSenne/mcbuild/master/assets/MCB%20Title%20B.png" alt="MCB Banner"/>

## need help?

feel free to come ask for help in the mc-build discord https://discord.gg/kpGqTDX.

# mc-build

mc-build is a cli tool that helps with the creation of data packs through compiling a custom format to functions. the cli by default ships with just the mc language although you can add more languages by putting them in the `lang` folder in your project root.

## cli

| command                 | result                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `mcb`                   | will build the project in the active directory                                                                              |
| `mcb -config [js,json]` | generate a config file based on the default configs of all loaded languages.                                                |
| `mcb -build`            | will cause mc-build to run a single build of the project and then exit, also sets the build flag in the js config to `true` |

## installation

### prerequisites

mc-build runs on nodejs, if you don't already have it you can get it at https://nodejs.org

### yarn

```bash
$ yarn global add mc-build
```

### npm

```bash
$ npm i -g mc-build
```

### documentation

The documentaion is available [here](https://www.notion.so/mc-build-docs-aefab309c8d3492982296abbb1853826 "Docs").

### I as well as the mc-build project am not affiliated with Mojang in any way.
