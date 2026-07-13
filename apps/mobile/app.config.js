const fs = require("node:fs");
const path = require("node:path");

const publicMobileVariables = new Set([
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
]);

function loadPublicMobileEnvironment() {
  const environmentPath = path.resolve(__dirname, "../../.env");
  if (!fs.existsSync(environmentPath)) return;

  for (const line of fs.readFileSync(environmentPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || !publicMobileVariables.has(match[1]) || process.env[match[1]])
      continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

module.exports = ({ config }) => {
  loadPublicMobileEnvironment();
  return config;
};
