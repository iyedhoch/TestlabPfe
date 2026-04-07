export class DocumentVersionDto {
  id: number;
  projectId: number;
  version: number;
  createdAt: string;
  author: string;
  summary: string;

  constructor(data: {
    id: number;
    projectId: number;
    version: number;
    createdAt: string;
    author: string;
    summary: string;
  }) {
    this.id = data.id;
    this.projectId = data.projectId;
    this.version = data.version;
    this.createdAt = data.createdAt;
    this.author = data.author;
    this.summary = data.summary;
  }
}
