export type ServiceCategory = {
  slug: string;
  title: string;
  copy: string;
  fromPrice: number;
  icon: "car" | "sparkles" | "spray" | "shield" | "seat";
  /** Backend ServiceCategory enum value used by /search?service= */
  backendFilter: "EXTERIOR" | "INTERIOR" | "FULL_WASH" | "DETAILING" | "ADD_ONS";
};

export const serviceCategories: ServiceCategory[] = [
  {
    slug: "basic-wash",
    title: "Basic Wash",
    copy: "A quick and effective clean for your everyday ride.",
    fromPrice: 50,
    icon: "car",
    backendFilter: "EXTERIOR",
  },
  {
    slug: "premium-wash",
    title: "Premium Wash",
    copy: "Deep clean with extra care for a flawless finish.",
    fromPrice: 80,
    icon: "sparkles",
    backendFilter: "FULL_WASH",
  },
  {
    slug: "full-detail",
    title: "Full Detail",
    copy: "Inside and out. Because your car deserves more.",
    fromPrice: 120,
    icon: "spray",
    backendFilter: "DETAILING",
  },
  {
    slug: "wax-polish",
    title: "Wax & Polish",
    copy: "Long-lasting shine and protection.",
    fromPrice: 100,
    icon: "shield",
    backendFilter: "ADD_ONS",
  },
  {
    slug: "interior-cleaning",
    title: "Interior Cleaning",
    copy: "Fresh, clean and comfortable interiors.",
    fromPrice: 70,
    icon: "seat",
    backendFilter: "INTERIOR",
  },
];
