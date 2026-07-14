export type StaticContentStatus = "draft" | "published";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  status: StaticContentStatus;
}

export interface ProductGuideItem {
  id: string;
  name: string;
  category: string;
  summary: string;
  status: StaticContentStatus;
}
