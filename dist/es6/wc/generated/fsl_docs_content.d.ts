export interface DocsPage {
    id: string;
    section: string;
    title: string;
    order: number;
    teaches: string[];
    mentions: string[];
    indexTerms: string[];
    body: string;
}
export interface DocsFeature {
    id: string;
    surface: string;
    title: string;
    tier: string;
    referenceAnchor?: string;
    indexTerms: string[];
}
export declare const DOCS_PAGES: DocsPage[];
export declare const DOCS_FEATURES: DocsFeature[];
