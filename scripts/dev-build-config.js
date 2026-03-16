import path from "node:path";

function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/\/+$/, "");
}

function isWindowsAbsolutePath(value = "") {
  return /^[A-Za-z]:[\\/]/.test(String(value || ""));
}

function resolveConfiguredDir(dir, cwd) {
  if (!dir || !dir.trim()) {
    return null;
  }

  const resolvedDir =
    path.isAbsolute(dir) || isWindowsAbsolutePath(dir)
      ? dir
      : path.resolve(cwd, dir);
  return normalizePath(resolvedDir);
}

function resolveWorkspacePluginDir(workspacePath, pluginName, cwd) {
  if (!workspacePath || !workspacePath.trim()) {
    return null;
  }

  const resolvedWorkspace = path.isAbsolute(workspacePath) || isWindowsAbsolutePath(workspacePath)
    ? workspacePath
    : path.resolve(cwd, workspacePath);

  return normalizePath(path.join(resolvedWorkspace, "data", "plugins", pluginName));
}

export function resolveBuildDirectories({
  isWatch,
  env,
  pluginName,
  cwd = process.cwd(),
}) {
  if (!isWatch) {
    return {
      distDir: "dist",
      livereloadDir: "dev",
    };
  }

  const configuredDevDistDir = resolveConfiguredDir(env.VITE_DEV_DIST_DIR, cwd);
  const workspacePluginDir = resolveWorkspacePluginDir(
    env.VITE_SIYUAN_WORKSPACE_PATH,
    pluginName,
    cwd,
  );
  const watchDistDir = configuredDevDistDir ?? workspacePluginDir ?? "dev";

  return {
    distDir: watchDistDir,
    livereloadDir: watchDistDir,
  };
}
