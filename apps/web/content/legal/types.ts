export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  versionLabel: string;
  sections: LegalSection[];
};
