import {
  File,
  OpenFile,
  WASI,
  ConsoleStdout,
  PreopenDirectory,
  Directory,
} from "@bjorn3/browser_wasi_shim";
import * as wasi_util from "./wasi-util";
import wasmModuleUrl from "../assets/out.wasm?url";

import type { WasiCommand } from "../types/wasi-command";
import type {
  DirectoryMap,
  WasiOutputResponse,
  WasiResponse,
} from "../types/wasi-response";

// const command =
//   "lilypond -dbackend=eps -dno-gs-load-fonts -dinclude-eps-fonts --png -dresolution=600 -dcrop main.ly".split(
//     " ",
//   );

const defaultCommand =
  "lilypond -dbackend=eps -dno-gs-load-fonts -dinclude-eps-fonts --png main".split(
    " ",
  );

onmessage = async function (command: MessageEvent<WasiCommand>) {
  switch (command.data.type) {
    case "init":
      await initWasi(["arg0"].concat(defaultCommand));
      postMessage({ type: "ready" } satisfies WasiResponse);
      return;
    case "run-wasi":
      startWasi(command.data.file);
      return;
  }
};

function statusUpdate(message: string) {
  postMessage({
    type: "status-update",
    value: message,
  } satisfies WasiResponse);
}

function logMessage(
  message: string,
  stream: WasiOutputResponse["stream"] = "stdout",
) {
  postMessage({
    type: "wasi-output",
    stream,
    value: message,
  } satisfies WasiResponse);
}

function flattenDirectory(dir: Directory): DirectoryMap {
  const result: DirectoryMap = new Map();
  for (let [name, inode] of dir.contents) {
    if (inode instanceof Directory) {
      result.set(name, flattenDirectory(inode));
    } else if (inode instanceof File) {
      result.set(name, inode.data);
    }
  }
  return result;
}

let appdir = new PreopenDirectory("/app", new Map());
let inst: WebAssembly.WebAssemblyInstantiatedSource;
let wasi: WASI;

async function initWasi(args: string[]) {
  statusUpdate(`Loading lilypond module from: ${wasmModuleUrl}`);
  const stdin = new OpenFile(new File([]));
  const stdout = ConsoleStdout.lineBuffered((msg) => logMessage(msg, "stdout"));
  const stderr = ConsoleStdout.lineBuffered((msg) => logMessage(msg, "stderr"));
  const root = new PreopenDirectory("/", new Map());
  const fds = [stdin, stdout, stderr, root, appdir];
  wasi = new WASI(args, [], fds, { debug: true });
  wasiHack(wasi);
  inst = await WebAssembly.instantiateStreaming(
    fetch(wasmModuleUrl, { credentials: "same-origin" }),
    { wasi_snapshot_preview1: wasi.wasiImport },
  );
  statusUpdate("Lilypond initialized");
}

async function startWasi(file: string) {
  statusUpdate("Running lilypond...");
  const startTime = performance.now();
  appdir.dir.contents.set("main.ly", new File(new TextEncoder().encode(file)));
  // @ts-expect-error some typing is off
  wasi.start(inst.instance);
  statusUpdate("Lilypond execution complete");

  const endTime = performance.now();
  const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);

  console.log("Files:", appdir.dir.contents);
  postMessage({
    type: "wasi-result",
    files: flattenDirectory(appdir.dir),
    compilationTime: endTime - startTime,
  } satisfies WasiResponse);
  statusUpdate(`Ran lilypond in ${durationSeconds} seconds`);
  await initWasi(["arg0"].concat(defaultCommand));
  postMessage({ type: "ready" } satisfies WasiResponse);
}

function wasiHack(wasi: WASI) {
  // definition from wasi-libc https://github.com/WebAssembly/wasi-libc/blob/wasi-sdk-19/expected/wasm32-wasi/predefined-macros.txt
  const ERRNO_INVAL = 28;
  wasi.wasiImport.poll_oneoff = (
    in_ptr: number,
    out_ptr: number,
    nsubscriptions: number,
    nevents_ptr: number,
  ): number => {
    if (nsubscriptions == 0) {
      return ERRNO_INVAL;
    }
    let buffer = new DataView(wasi.inst.exports.memory.buffer);
    let in_ = wasi_util.Subscription.read_bytes_array(
      buffer,
      in_ptr,
      nsubscriptions,
    );
    let isClockPoll = false;
    let clockSub: wasi_util.Subscription;
    let timeout = Number.MAX_VALUE;
    for (let sub of in_) {
      if (sub.u.tag.variant == "fd_read") {
        const subFd = (sub.u.data as wasi_util.SubscriptionFdReadWrite).fd;
        if (subFd != 0) {
          console.warn("Unsupported fd in poll_oneoff:", subFd);
          return ERRNO_INVAL; // only fd=0 is supported as of now (FIXME)
        }
      } else if (sub.u.tag.variant == "clock") {
        const subTimeout = (sub.u.data as wasi_util.SubscriptionClock).timeout;
        if (subTimeout < timeout) {
          timeout = subTimeout;
          isClockPoll = true;
          clockSub = sub;
        }
      } else {
        return ERRNO_INVAL; // FIXME
      }
    }
    const events = [];
    if (isClockPoll) {
      let event = new wasi_util.Event(
        clockSub!.userdata,
        0,
        new wasi_util.EventType("clock"),
      );
      event.userdata = clockSub!.userdata;
      event.error = 0;
      event.type = new wasi_util.EventType("clock");
      events.push(event);
    }
    var len = events.length;
    wasi_util.Event.write_bytes_array(buffer, out_ptr, events);
    buffer.setUint32(nevents_ptr, len, true);
    return 0;
  };
}
