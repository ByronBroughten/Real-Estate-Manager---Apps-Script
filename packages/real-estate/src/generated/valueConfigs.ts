import { makeValueConfigs } from "../../../framework/src/01_SpreadsheetSchema/makeConfigs";

export const valueConfigs = makeValueConfigs({
  "chargeOnetimeDescription": [
    "Security deposit",
    "Late fee",
    "Damage, waste, or service"
  ],
  "paymentStatus": [
    "Verified",
    "Guaranteed"
  ],
  "payerCategory": [
    "Household",
    "Non-occupant",
    "Security deposit"
  ],
  "expenseCategory": [
    "Repair",
    "Supplies",
    "Cleaning & maintenance",
    "Depreciation expense or depletion",
    "Utilities",
    "Insurance",
    "Taxes",
    "Mortgage interest paid to banks",
    "Legal & professional",
    "Advertising",
    "Auto and travel",
    "Mgmt fees",
    "Commissions",
    "Other interest",
    "Other",
    "Principal"
  ],
  "residenceTaxAdjust": [
    "Minus primary space",
    "Primary residence",
    "Half primary residence",
    "Minus primary time space"
  ],
  "receiptFormat": [
    "Electronic",
    "Physical",
    "Cash ledger",
    "Text message",
    "Biller website",
    "Email",
    "Cash App",
    "Venmo",
    "Unknown"
  ],
  "chargeReduceDescription": [
    "Forgiveness"
  ],
  "yesOrNo": [
    "Yes",
    "No"
  ],
  "chargeDescription": [
    "Base rent",
    "Utilities",
    "Pet rent",
    "Caretaker rent reduction",
    "Security deposit",
    "Late fee",
    "Damage, waste, or service"
  ],
  "formOfPayment": [
    "Payment",
    "Caretaking",
    "Cash App",
    "Venmo",
    "Check"
  ],
  "paymentAllocationDefault": [
    "Earliest unaccounted charge",
    "Next or latest unaccounted charge"
  ]
});
