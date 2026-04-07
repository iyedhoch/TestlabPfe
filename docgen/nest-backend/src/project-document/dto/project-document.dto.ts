export class ProjectDocumentDto {
  id: number;
  projectName: string;
  owner: string;

  constructor(data: { id: number; projectName: string; owner: string }) {
    this.id = data.id;
    this.projectName = data.projectName;
    this.owner = data.owner;
  }
}
