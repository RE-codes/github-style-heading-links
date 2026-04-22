import { TFile, TFolder } from "obsidian";

export function makeFile(path: string): TFile {
  return Object.assign(new TFile(), { path });
}

export function makeFolder(path: string): TFolder {
  return Object.assign(new TFolder(), { path });
}

export type TestHeading = {
  heading: string;
  position: { start: { line: number } };
};

export function heading(text: string, line: number): TestHeading {
  return {
    heading: text,
    position: { start: { line } }
  };
}

export function makeApp({
  files = [] as Array<TFile | TFolder>,
  resolvedFiles = [] as TFile[],
  headingEntries = [] as Array<[TFile | TFolder, TestHeading[]]>,
  getFileCache
}: {
  files?: Array<TFile | TFolder>;
  resolvedFiles?: TFile[];
  headingEntries?: Array<[TFile | TFolder, TestHeading[]]>;
  getFileCache?: (file: { path: string }) => { headings: TestHeading[] } | null;
} = {}) {
  const filesByPath = new Map(files.map((file) => [file.path, file]));
  const resolvedFilesByLinkpath = new Map(
    resolvedFiles.map((file) => [file.path, file])
  );
  const headingsByPath = new Map(
    headingEntries.map(([file, headings]) => [file.path, headings])
  );

  return {
    vault: {
      getAbstractFileByPath: (path: string) => filesByPath.get(path) ?? null
    },
    metadataCache: {
      getFirstLinkpathDest: (linkpath: string) =>
        resolvedFilesByLinkpath.get(linkpath) ?? null,
      getFileCache:
        getFileCache ??
        ((file: { path: string }) => ({
          headings: headingsByPath.get(file.path) ?? []
        }))
    }
  };
}
