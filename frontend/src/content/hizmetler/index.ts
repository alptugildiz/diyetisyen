import type { ServiceContent } from "./types";
import kiloVerme from "./kilo-verme-danismanligi";
import kiloAlma from "./kilo-alma-danismanligi";
import sporcu from "./sporcu-beslenmesi";
import hastalik from "./hastaliklara-ozel-beslenme";
import arinma from "./arinma-ve-beslenme-duzenleme";
import gebelik from "./gebelikte-beslenme";
import emzirme from "./emzirme-doneminde-beslenme";

/**
 * Hizmet listesinin tek kaynağı. Ana sayfadaki kartlar (Services.tsx),
 * /hizmetler listesi ve sitemap hepsi buradan besleniyor.
 */
export const SERVICES: ServiceContent[] = [
  kiloVerme,
  kiloAlma,
  sporcu,
  hastalik,
  arinma,
  gebelik,
  emzirme,
];

export function getService(slug: string): ServiceContent | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export type { ServiceContent, ServiceFaq, ServiceSection } from "./types";
