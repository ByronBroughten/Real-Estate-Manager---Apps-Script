import { Obj } from "../../../utils/Obj";

export const chargeVarbToDescriptor = {
  rentChargeBaseMonthly: "Rent charge (base)",
  rentChargeUtilitiesMonthly: "Rent charge (utilities)",
  petFeeRecurring: "Pet fee (recurring)",
  caretakerRentReduction: "Caretaker rent reduction",
} as const;

export const leaseChargeVarbNames = Obj.keys(chargeVarbToDescriptor);
