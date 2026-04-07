export class VersionDiffDto {
  version1: number;
  version2: number;
  changes: string[];

  constructor(data: { version1: number; version2: number; changes: string[] }) {
    this.version1 = data.version1;
    this.version2 = data.version2;
    this.changes = data.changes;
  }
}
