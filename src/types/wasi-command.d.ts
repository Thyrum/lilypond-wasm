export type WasiCommand = InitCommand | RunWasiCommand;

export interface InitCommand {
  type: "init";
  outputFormat?: "png" | "svg" | "pdf";
}

export interface RunWasiCommand {
  type: "run-wasi";
  file: string;
}
