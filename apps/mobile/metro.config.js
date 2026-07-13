const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const webAppRoot = path.resolve(projectRoot, "../web");
const config = getDefaultConfig(projectRoot);

// This monorepo intentionally uses React 18 for Next.js and React 19 for Expo.
// A hoisted native dependency can otherwise walk up to the workspace root and
// load React 18. Intercept only React imports so nested Expo dependencies keep
// their normal resolution behavior.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isReactModule =
    moduleName === "react" ||
    moduleName.startsWith("react/") ||
    moduleName === "react-dom" ||
    moduleName.startsWith("react-dom/");

  if (isReactModule) {
    return {
      type: "sourceFile",
      filePath: require.resolve(moduleName, { paths: [projectRoot] }),
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

// Expo discovers every npm workspace automatically. The mobile bundle does not
// import the Next.js app, and watching its disposable `.next` folders can make
// Metro crash on Windows while Next rebuilds them.
config.watchFolders = config.watchFolders.filter(
  (folder) => path.resolve(folder) !== webAppRoot,
);

const escapedWebRoot = webAppRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
config.resolver.blockList = [
  ...(config.resolver.blockList ?? []),
  new RegExp(`^${escapedWebRoot}[\\\\/]\\.next(?:[\\\\/].*)?$`),
];

module.exports = config;
