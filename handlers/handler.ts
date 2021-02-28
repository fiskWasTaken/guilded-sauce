export interface HandlerResult {
    tags: string[];
    description: string;
    title: string;
    media: string[];
}

export abstract class Handler {
    id: string = "none";

    public constructor(public options: object) {}
    abstract handle(url: string): Promise<HandlerResult>;
}