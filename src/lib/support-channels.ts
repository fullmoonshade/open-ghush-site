import { optionalHttpsUrl } from "@/lib/public-config";

export type SupportChannel = {
  id: string;
  name: string;
  kind: string;
  cta: string;
  /** Empty string means the channel is announced but not live yet. */
  url: string;
};

export const supportChannels: SupportChannel[] = [
  {
    id: "supportkori",
    name: "Buy a featured message",
    kind: "BANGLADESH · BDT",
    cta: "BUY A FEATURED MESSAGE →",
    url: optionalHttpsUrl(process.env.NEXT_PUBLIC_SUPPORTKORI_URL),
  },
  {
    id: "outside-bangladesh",
    name: "Buy us a coffee",
    kind: "USD · GBP · EUR · CAD · AUD",
    cta: "BUY US A COFFEE →",
    url: optionalHttpsUrl(process.env.NEXT_PUBLIC_DONATION_URL),
  },
];
