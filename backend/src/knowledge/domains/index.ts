/**
 * Domain intelligence templates (`context.md` §26, `architecture.md` §7.4).
 * Templates propose a starting draft; they never auto-apply components.
 */
import eCommerce from "./e_commerce.json" with { type: "json" };
import socialMedia from "./social_media.json" with { type: "json" };
import chat from "./chat.json" with { type: "json" };
import foodDelivery from "./food_delivery.json" with { type: "json" };
import rideSharing from "./ride_sharing.json" with { type: "json" };
import videoStreaming from "./video_streaming.json" with { type: "json" };
import saas from "./saas.json" with { type: "json" };
import booking from "./booking.json" with { type: "json" };
import crm from "./crm.json" with { type: "json" };
import learning from "./learning.json" with { type: "json" };

export const domainTemplateFiles: unknown[] = [
  eCommerce,
  socialMedia,
  chat,
  foodDelivery,
  rideSharing,
  videoStreaming,
  saas,
  booking,
  crm,
  learning,
];
