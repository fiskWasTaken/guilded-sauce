export interface HandlerResult {
    tags: string[];
    description: string;
    title: string;
    media: string[];
}

export abstract class Handler {
    id: string = "none";

    abstract handle(url: string): Promise<HandlerResult>;
}