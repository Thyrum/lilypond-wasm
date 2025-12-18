import {
  File,
  OpenFile,
  WASI,
  ConsoleStdout,
  PreopenDirectory,
} from "@bjorn3/browser_wasi_shim";
import * as wasi_util from "./wasi-util";
import wasmModuleUrl from "../assets/out.wasm?url";

import type { WasiCommand } from "../types/wasi-command";
import type { WasiOutputResponse, WasiResponse } from "../types/wasi-response";

// const command =
//   "lilypond -dbackend=eps -dno-gs-load-fonts -dinclude-eps-fonts --png -dresolution=600 -dcrop main.ly".split(
//     " ",
//   );

const defaultCommand =
  "lilypond -dbackend=eps -dno-gs-load-fonts -dinclude-eps-fonts -dcrop --png main".split(
    " ",
  );

onmessage = async function (command: MessageEvent<WasiCommand>) {
  switch (command.data.type) {
    case "init":
      await initWasi(["arg0"].concat(defaultCommand));
      postMessage({ type: "ready" } as WasiResponse);
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
  } as WasiResponse);
}

function logMessage(
  message: string,
  stream: WasiOutputResponse["stream"] = "stdout",
) {
  postMessage({
    type: "wasi-output",
    stream,
    value: message,
  } as WasiResponse);
}

let appdir = new PreopenDirectory("/app", new Map());
let inst: WebAssembly.WebAssemblyInstantiatedSource;
let wasi: WASI;

async function initWasi(args: string[]) {
  statusUpdate(`Loading WASM module from: ${wasmModuleUrl}`);
  const stdin = new OpenFile(new File([]));
  const stdout = ConsoleStdout.lineBuffered((msg) => logMessage(msg, "stdout"));
  const stderr = ConsoleStdout.lineBuffered((msg) => logMessage(msg, "stderr"));
  const root = new PreopenDirectory("/", new Map());
  const currentDir = new PreopenDirectory(".", appdir.dir.contents);
  const fds = [stdin, stdout, stderr, root, appdir, currentDir];
  wasi = new WASI(args, [], fds);
  wasiHack(wasi);
  inst = await WebAssembly.instantiateStreaming(
    fetch(wasmModuleUrl, { credentials: "same-origin" }),
    { wasi_snapshot_preview1: wasi.wasiImport },
  );
  statusUpdate("WASM Initialized");
}

async function startWasi(file: string) {
  statusUpdate("Starting WASI application");
  appdir.dir.contents.set("main.ly", new File(new TextEncoder().encode(file)));
  // @ts-expect-error some typing is off
  wasi.start(inst.instance);
  statusUpdate("WASM execution complete");

  console.log("Files:", appdir.dir.contents);
  const generatedFile = appdir.dir.contents.get("main.png");
  if (generatedFile instanceof File) {
    const pngData = generatedFile.data;
    postMessage({ type: "wasi-result", value: pngData } as WasiResponse);
  } else {
    statusUpdate("Unable to decode generated file");
  }
}

function wasiHack(wasi: WASI) {
  // definition from wasi-libc https://github.com/WebAssembly/wasi-libc/blob/wasi-sdk-19/expected/wasm32-wasi/predefined-macros.txt
  const ERRNO_INVAL = 28;
  wasi.wasiImport.poll_oneoff = (
    in_ptr,
    out_ptr,
    nsubscriptions,
    nevents_ptr,
  ) => {
    if (nsubscriptions == 0) {
      return ERRNO_INVAL;
    }
    let buffer = new DataView(wasi.inst.exports.memory.buffer);
    let in_ = wasi_util.Subscription.read_bytes_array(
      buffer,
      in_ptr,
      nsubscriptions,
    );
    let isReadPollStdin = false;
    let isReadPollConn = false;
    let isClockPoll = false;
    let clockSub;
    let timeout = Number.MAX_VALUE;
    for (let sub of in_) {
      if (sub.u.tag.variant == "fd_read") {
        const subFd = (sub.u.data as wasi_util.SubscriptionFdReadWrite).fd;
        if (subFd != 0) {
          console.log("poll_oneoff: unknown fd " + subFd);
          return ERRNO_INVAL; // only fd=0 is supported as of now (FIXME)
        }
        if (subFd == 0) {
          isReadPollStdin = true;
        } else {
          isReadPollConn = true;
        }
      } else if (sub.u.tag.variant == "clock") {
        const subTimeout = (sub.u.data as wasi_util.SubscriptionClock).timeout;
        if (subTimeout < timeout) {
          timeout = subTimeout;
          isClockPoll = true;
          clockSub = sub;
        }
      } else {
        console.log("poll_oneoff: unknown variant " + sub.u.tag.variant);
        return ERRNO_INVAL; // FIXME
      }
    }
    const events = [];
    if (isReadPollStdin || isReadPollConn || isClockPoll) {
      if (isReadPollConn) {
        return ERRNO_INVAL;
      }
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
    }
    var len = events.length;
    wasi_util.Event.write_bytes_array(buffer, out_ptr, events);
    buffer.setUint32(nevents_ptr, len, true);
    return 0;
  };
}
