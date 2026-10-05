export type Testimonial = {
  name: string;
  role: string;
  quote: string;
  initials: string;
};

export const testimonials: Testimonial[] = [
  {
    name: "Ama Serwaa",
    role: "Customer",
    quote:
      "The process was so easy and convenient. My car has never looked better!",
    initials: "AS",
  },
  {
    name: "Kwame Mensah",
    role: "Customer",
    quote:
      "Great service, friendly staff and very professional. Highly recommend!",
    initials: "KM",
  },
  {
    name: "Efua Boateng",
    role: "Customer",
    quote:
      "I love the app! Booking is quick and I can find a car wash near me in seconds.",
    initials: "EB",
  },
];
