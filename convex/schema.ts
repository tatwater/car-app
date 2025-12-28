import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  cars: defineTable({
    // Basic car info
    make: v.string(),
    model: v.string(),
    trim: v.optional(v.string()),
    year: v.number(),
    nickname: v.optional(v.string()),
    
    // Extended profile info (optional)
    vin: v.optional(v.string()),
    color: v.optional(v.string()),
    purchaseDate: v.optional(v.number()), // Added purchase date
    purchaseMileage: v.optional(v.number()), // Mileage at time of purchase
    
    // MSRP breakdown
    baseMsrp: v.optional(v.number()),
    baseMsrpFeatures: v.optional(v.array(v.string())), // Features included in base MSRP
    optionalPackages: v.optional(v.array(v.object({
      name: v.string(),
      price: v.number(),
      features: v.optional(v.array(v.string())) // Features included in this package
    }))),
    destinationDelivery: v.optional(v.number()),
    dealershipAccessories: v.optional(v.array(v.object({
      name: v.string(),
      price: v.number()
    }))),
    buyerAccessories: v.optional(v.array(v.object({
      name: v.string(),
      price: v.number(),
      dateAdded: v.number()
    }))),
    
    // Purchase info
    actualPurchasePrice: v.optional(v.number()),
    discount: v.optional(v.number()),
    dealershipFees: v.optional(v.array(v.object({
      name: v.string(),
      amount: v.number()
    }))),
    
    // Payment breakdown
    downPayments: v.optional(v.array(v.object({
      type: v.union(v.literal("check"), v.literal("credit_card"), v.literal("cash"), v.literal("other")),
      amount: v.number(),
      description: v.optional(v.string())
    }))),
    tradeInValue: v.optional(v.number()),
    tradeInVehicle: v.optional(v.string()), // Legacy field - will be migrated
    tradeInMake: v.optional(v.string()),
    tradeInModel: v.optional(v.string()),
    tradeInTrim: v.optional(v.string()),
    tradeInYear: v.optional(v.number()),
    tradeInVin: v.optional(v.string()),
    tradeInMileage: v.optional(v.number()),
    
    // Loan info
    loanAmount: v.optional(v.number()),
    loanTerm: v.optional(v.number()), // months
    interestRate: v.optional(v.number()),
    monthlyPayment: v.optional(v.number()),
    loanBank: v.optional(v.string()), // Added loan bank name
    
    // Sale info (when sold)
    salePrice: v.optional(v.number()),
    saleMileage: v.optional(v.number()),
    buyerInfo: v.optional(v.object({
      businessName: v.optional(v.string()),
      personName: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      email: v.optional(v.string())
    })),
    
    // Total loss info (when totaled)
    totalLossDate: v.optional(v.number()),
    totalLossMileage: v.optional(v.number()),
    insuranceCompany: v.optional(v.string()),
    claimNumber: v.optional(v.string()),
    insurancePayout: v.optional(v.number()),
    accidentDescription: v.optional(v.string()),
    
    // Salesperson info
    salesperson: v.optional(v.object({
      name: v.string(),
      dealership: v.string(),
      address: v.string(),
      phone: v.optional(v.string()),
      email: v.optional(v.string())
    })),
    
    // Ownership
    ownerId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    
    // Archive status
    isArchived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    archivedReason: v.optional(v.string()) // "traded_in", "sold", "totaled", etc.
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_active", ["ownerId", "isArchived"])
    .index("by_make_model", ["make", "model"])
    .index("by_vin", ["vin"]),

  carShares: defineTable({
    carId: v.id("cars"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("shared")),
    sharedAt: v.number(),
    sharedBy: v.id("users")
  })
    .index("by_car", ["carId"])
    .index("by_user", ["userId"])
    .index("by_car_user", ["carId", "userId"]),

  expenses: defineTable({
    carId: v.id("cars"),
    userId: v.id("users"), // who recorded the expense
    
    // Expense details
    category: v.union(
      v.literal("fuel"),
      v.literal("maintenance"),
      v.literal("repair"),
      v.literal("insurance"),
      v.literal("registration"),
      v.literal("inspection"),
      v.literal("parking"),
      v.literal("tolls"),
      v.literal("accessories"),
      v.literal("loan_payment"), // Added loan payment category
      v.literal("other")
    ),
    subcategory: v.optional(v.string()),
    description: v.string(),
    amount: v.number(),
    date: v.number(),
    
    // Additional info
    mileage: v.optional(v.number()),
    location: v.optional(v.string()),
    vendor: v.optional(v.string()),
    
    // Loan payment specific fields
    principalAmount: v.optional(v.number()), // Amount that went to principal
    interestAmount: v.optional(v.number()), // Amount that went to interest
    
    // Receipt info
    receiptId: v.optional(v.id("_storage")),
    
    createdAt: v.number()
  })
    .index("by_car", ["carId"])
    .index("by_user", ["userId"])
    .index("by_car_date", ["carId", "date"])
    .index("by_category", ["category"])
    .index("by_car_category", ["carId", "category"]),

  maintenanceSchedule: defineTable({
    carId: v.id("cars"),
    
    // Maintenance item
    type: v.string(), // "Oil Change", "Tire Rotation", etc.
    description: v.optional(v.string()),
    
    // Schedule info
    intervalMiles: v.optional(v.number()),
    intervalMonths: v.optional(v.number()),
    
    // Last performed
    lastPerformedDate: v.optional(v.number()),
    lastPerformedMileage: v.optional(v.number()),
    
    // Next due
    nextDueDate: v.optional(v.number()),
    nextDueMileage: v.optional(v.number()),
    
    isActive: v.boolean(),
    createdAt: v.number()
  })
    .index("by_car", ["carId"])
    .index("by_car_active", ["carId", "isActive"])
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
