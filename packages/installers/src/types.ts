export interface InstallContext {
  /** Directory where the IDE keeps its config. */
  ideConfigDir: string;
  /** Absolute path to the caveman-mem CLI (resolved by the caller). */
  cliPath: string;
  /** Absolute path to the local data dir (e.g., ~/.caveman-mem). */
  dataDir: string;
}

export interface Installer {
  id: string;
  label: string;
  detect(ctx: InstallContext): Promise<boolean>;
  install(ctx: InstallContext): Promise<string[]>;
  uninstall(ctx: InstallContext): Promise<string[]>;
}
