import "./style.css";

import Worker from "./../workers/wasi-worker?worker";
import { addMessage } from "./log";

import type { DirectoryMap, WasiResponse } from "../types/wasi-response";
import type { WasiCommand } from "../types/wasi-command";
import { decodeUrlData, encodeDataForUrl } from "./compress";

const worker = new Worker();

const status = document.getElementById("status");
const log = document.getElementById("log");
const input = document.getElementById("source") as HTMLTextAreaElement;
const compileButton = document.getElementById(
  "compile-button",
) as HTMLButtonElement;
compileButton.onclick = function () {
  compileButton.disabled = true;
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
};

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

function download_file(name: string, blob: Blob) {
  var dlink = document.createElement("a");
  dlink.download = name;
  dlink.href = window.URL.createObjectURL(blob);
  dlink.onclick = function () {
    // revokeObjectURL needs a delay to work properly
    var that = this as HTMLAnchorElement;
    setTimeout(function () {
      window.URL.revokeObjectURL(that.href);
    }, 1500);
  };

  dlink.click();
  dlink.remove();
}

function getImages(dir: DirectoryMap): Map<string, Blob> {
  let result = new Map<string, Blob>();

  for (let [path, content] of dir) {
    if (content instanceof Map) {
      const subImages = getImages(content);
      for (let [subPath, blob] of subImages) {
        result.set(path + "/" + subPath, blob);
      }
    } else if (content instanceof Uint8Array) {
      if (path.endsWith(".png")) {
        // Use slice() to handle cases where content contains a SharedArrayBuffer
        result.set(path, new Blob([content.slice()], { type: "image/png" }));
      }
    }
  }
  return result;
}

function displayImages(images: Map<string, Blob>) {
  const selector = document.getElementById("png-select") as HTMLSelectElement;
  const downloadButton = document.getElementById(
    "download-button",
  ) as HTMLButtonElement;
  const imageContainer = document.getElementById(
    "image-container",
  ) as HTMLDivElement;
  const image = document.createElement("img");
  selector.onchange = function () {
    image.src = window.URL.createObjectURL(images.get(selector.value)!);
    downloadButton.onclick = () =>
      download_file(selector.value, images.get(selector.value)!);
  };
  if (images.size > 0) {
    selector.innerHTML = "";
    image.src = window.URL.createObjectURL(images.values().next().value!);
    downloadButton.onclick = () =>
      download_file(selector.value, images.get(selector.value)!);
    downloadButton.disabled = false;
  } else {
    selector.innerHTML = "<option>Select png...</option>";
  }
  for (const filename of images.keys()) {
    selector.options.add(new Option(filename, filename));
  }
  selector.disabled = images.size <= 1;
  imageContainer.innerHTML = "";
  imageContainer.appendChild(image);
}

worker.onmessage = function (e: MessageEvent<WasiResponse>) {
  switch (e.data.type) {
    case "ready":
      compileButton.disabled = false;
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
      displayImages(images);
      return;
  }
};
worker.postMessage({ type: "init" } satisfies WasiCommand);
