export type WasiCommand = InitCommand | RunWasiCommand;

export interface InitCommand {
  type: "init";
}

export interface RunWasiCommand {
  type: "run-wasi";
}
