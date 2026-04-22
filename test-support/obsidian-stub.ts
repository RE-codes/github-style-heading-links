export class TAbstractFile {
  constructor(public path: string) {}
}

export class TFile extends TAbstractFile {}

export class TFolder extends TAbstractFile {}

export class Plugin {
  async onload(): Promise<void> {
    return;
  }

  onunload(): void {
    return;
  }
}
