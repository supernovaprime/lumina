export type ServiceCategory = {
  slug: string;
  title: string;
  copy: string;
  fromPrice: number;
  icon: "car" | "sparkles" | "spray" | "shield" | "seat";
  image: string;
  alt: string;
  popular?: boolean;
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
    image: "/assets/service-basic-wash.jpg",
    alt: "Basic wash service",
    backendFilter: "EXTERIOR",
  },
  {
    slug: "premium-wash",
    title: "Premium Wash",
    copy: "Deep clean with extra care for a flawless finish.",
    fromPrice: 80,
    icon: "sparkles",
    image: "/assets/service-premium-wash.jpg",
    alt: "Premium foam wash",
    popular: true,
    backendFilter: "FULL_WASH",
  },
  {
    slug: "full-detail",
    title: "Full Detail",
    copy: "Inside and out. Because your car deserves more.",
    fromPrice: 120,
    icon: "spray",
    image: "/assets/service-full-detail.jpg",
    alt: "Full auto detailing",
    backendFilter: "DETAILING",
  },
  {
    slug: "wax-polish",
    title: "Wax & Polish",
    copy: "Long-lasting shine and environmental protection.",
    fromPrice: 100,
    icon: "shield",
    image: "/assets/service-wax-polish.jpg",
    alt: "Wax and polish",
    backendFilter: "ADD_ONS",
  },
  {
    slug: "interior-cleaning",
    title: "Interior Cleaning",
    copy: "Fresh, vacuumed, sanitized and comfortable cabin.",
    fromPrice: 70,
    icon: "seat",
    image: "/assets/service-interior-cleaning.jpg",
    alt: "Car interior cleaning",
    backendFilter: "INTERIOR",
  },
];
