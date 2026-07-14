export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  constructor(protected readonly model: T) {}

  abstract create(data: CreateInput): Promise<unknown>;
  abstract findById(id: number): Promise<unknown>;
  abstract findAll(): Promise<unknown[]>;
  abstract update(id: number, data: UpdateInput): Promise<unknown>;
  abstract delete(id: number): Promise<unknown>;
}
