import "./file-display.css";

export function displayFile(blob: Blob, parent: HTMLElement) {
  switch (blob.type) {
    case "image/png":
    case "image/jpeg":
    case "image/svg+xml":
    case "image/gif": {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(blob);
      parent.appendChild(img);
      break;
    }
    case "application/pdf": {
      const object = document.createElement("object");
      object.data = URL.createObjectURL(blob);
      parent.appendChild(object);
      break;
    }
    default: {
      const info = document.createElement("p");
      info.textContent = `Unsupported file type: ${blob.type}`;
      parent.appendChild(info);
      break;
    }
  }
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

export class FileDisplay {
  private controls: HTMLDivElement;
  private imageContainer: HTMLElement;
  private fileSelect: HTMLSelectElement;
  private readonly defaultOption: string = "<option>Select a file...</option>";
  private downloadButton: HTMLButtonElement;
  private files: Map<string, Blob> = new Map();

  constructor(parent: HTMLElement, additionalControls?: HTMLElement[]) {
    const root = document.createElement("div");
    root.className = "file-display";
    parent.appendChild(root);

    this.controls = document.createElement("controls") as HTMLDivElement;
    this.controls.className = "controls";

    additionalControls?.forEach((control) => {
      this.controls.appendChild(control);
    });

    this.fileSelect = document.createElement("select") as HTMLSelectElement;
    this.fileSelect.id = "file-select";
    this.fileSelect.disabled = true;
    this.fileSelect.innerHTML = this.defaultOption;
    this.fileSelect.onchange = () => {
      this.selectFile(this.fileSelect.value);
    };
    this.controls.appendChild(this.fileSelect);

    const spacer = document.createElement("div");
    spacer.className = "spacer";
    this.controls.appendChild(spacer);

    this.downloadButton = document.createElement("button") as HTMLButtonElement;
    this.downloadButton.textContent = "Download";
    this.downloadButton.disabled = true;
    this.controls.appendChild(this.downloadButton);

    root.appendChild(this.controls);

    this.imageContainer = document.createElement("div");
    this.imageContainer.className = "image-container";
    root.appendChild(this.imageContainer);
  }

  public selectFile(filename: string) {
    if (!this.files.has(filename)) {
      return;
    }
    const blob = this.files.get(filename)!;
    this.imageContainer.innerHTML = "";
    this.downloadButton.disabled = false;
    this.downloadButton.onclick = () => {
      download_file(filename, blob);
    };
    displayFile(blob, this.imageContainer);
  }

  public setFiles(files: Map<string, Blob>) {
    this.files = files;
    this.fileSelect.innerHTML = files.size > 0 ? "" : this.defaultOption;
    this.fileSelect.disabled = files.size <= 1;
    for (const filename of files.keys()) {
      this.fileSelect.options.add(new Option(filename, filename));
    }
    if (files.size > 0) {
      this.selectFile(this.fileSelect.options[0].value);
    }
  }
}
