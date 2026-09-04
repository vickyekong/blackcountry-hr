import { z } from "zod";
import { nairaToKobo } from "@/lib/money";

export const structureSchema = z.object({
  name: z.string().trim().min(1).max(120),
  grade: z.string().trim().max(40).optional().nullable(),
  basicNaira: z.number().min(0),
  housingNaira: z.number().min(0).default(0),
  transportNaira: z.number().min(0).default(0),
  feedingNaira: z.number().min(0).default(0),
  medicalNaira: z.number().min(0).default(0),
  communicationNaira: z.number().min(0).default(0),
  otherTaxableNaira: z.number().min(0).default(0),
  nonTaxableNaira: z.number().min(0).default(0),
});

export function structureData(body: z.infer<typeof structureSchema>) {
  return {
    name: body.name,
    grade: body.grade?.trim() ? body.grade.trim() : null,
    basicSalaryKobo: nairaToKobo(body.basicNaira),
    housingAllowanceKobo: nairaToKobo(body.housingNaira),
    transportAllowanceKobo: nairaToKobo(body.transportNaira),
    feedingAllowanceKobo: nairaToKobo(body.feedingNaira),
    medicalAllowanceKobo: nairaToKobo(body.medicalNaira),
    communicationAllowanceKobo: nairaToKobo(body.communicationNaira),
    otherTaxableAllowancesKobo: nairaToKobo(body.otherTaxableNaira),
    nonTaxableReimbursementsKobo: nairaToKobo(body.nonTaxableNaira),
  };
}
