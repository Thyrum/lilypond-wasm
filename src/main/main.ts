import "./style.css";

import Worker from "./../workers/wasi-worker?worker";
import { addMessage } from "./log";

import type { DirectoryMap, WasiResponse } from "../types/wasi-response";
import type { WasiCommand } from "../types/wasi-command";
import { decodeUrlData, encodeDataForUrl } from "./compress";
import { FileDisplay } from "./file-display/file-display";

const worker = new Worker();

const resultContainer = document.getElementById("result");

const compileButton = document.createElement("button");
compileButton.textContent = "Compile";
compileButton.disabled = true;

function compile() {
  compileButton.disabled = true;
  fileTypeSelect.disabled = true;
  const params = new URLSearchParams(window.location.search);
  encodeDataForUrl(input.value.trim()).then((encoded) => {
    params.set("ly", encoded);
    history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  });
  worker.postMessage({
    type: "run-wasi",
    file: input.value.trim(),
  } satisfies WasiCommand);
}

compileButton!.onclick = compile;

const fileTypeSelect = document.createElement("select");
fileTypeSelect.disabled = true;
fileTypeSelect.id = "file-type-select";
fileTypeSelect.title = "Select output file type";
fileTypeSelect.innerHTML =
  "<option value='svg' selected>SVG</option><option value='png'>PNG</option><option value='pdf'>PDF</option>";
fileTypeSelect.onchange = () => {
  compileButton.disabled = true;
  fileTypeSelect.disabled = true;
  worker.postMessage({
    type: "init",
    outputFormat: fileTypeSelect.value as "png" | "svg" | "pdf",
  } satisfies WasiCommand);
};

const fileDisplay = new FileDisplay(resultContainer!, [
  fileTypeSelect,
  compileButton,
]);

const status = document.getElementById("status");
const log = document.getElementById("log");
const input = document.getElementById("source") as HTMLTextAreaElement;

const lilypondCode = new URLSearchParams(window.location.search).get("ly");
if (lilypondCode) {
  decodeUrlData(lilypondCode)
    .then((decoded) => {
      input.value = decoded;
    })
    .catch((e) => {
      console.error("Error decoding lilypond data in URL:", e);
      input.value =
        "% Error decoding lilypond code from URL. Please enter your lilypond code here manually.";
    });
}

const extensions = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

function getImages(dir: DirectoryMap): Map<string, Blob> {
  let result = new Map<string, Blob>();

  for (let [path, content] of dir) {
    if (content instanceof Map) {
      const subImages = getImages(content);
      for (let [subPath, blob] of subImages) {
        result.set(path + "/" + subPath, blob);
      }
    } else if (content instanceof Uint8Array) {
      const extension = path.slice(path.lastIndexOf("."));
      if (extensions.hasOwnProperty(extension)) {
        // Use slice() to handle cases where content contains a SharedArrayBuffer
        result.set(
          path,
          new Blob([content.slice()], {
            type: extensions[extension as keyof typeof extensions],
          }),
        );
      }
    }
  }
  return result;
}

worker.onmessage = function (e: MessageEvent<WasiResponse>) {
  switch (e.data.type) {
    case "ready":
      compileButton.disabled = false;
      fileTypeSelect.disabled = false;
      return;
    case "status-update":
      status!.textContent = e.data.value;
      return;
    case "wasi-output":
      addMessage(log!, `[${e.data.stream}] ${e.data.value}`);
      return;
    case "wasi-result":
      addMessage(
        log!,
        `[lily-result] Compilation time: ${(e.data.compilationTime / 1000).toFixed(2)} seconds`,
      );
      console.debug("WASI Result:", e.data);
      const images = getImages(e.data.files);
      console.debug("Extracted images:", images);
      fileDisplay.setFiles(images);
      return;
  }
};
worker.postMessage({
  type: "init",
  outputFormat: fileTypeSelect.value as "svg" | "png" | "pdf",
} satisfies WasiCommand);
