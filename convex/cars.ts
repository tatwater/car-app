import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Get all cars for the current user (owned + shared)
export const getUserCars = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get cars owned by user (not archived)
    const ownedCars = await ctx.db
      .query("cars")
      .withIndex("by_owner_active", (q) => q.eq("ownerId", userId).eq("isArchived", undefined))
      .collect();

    // Get cars shared with user
    const sharedCarIds = await ctx.db
      .query("carShares")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sharedCars = await Promise.all(
      sharedCarIds.map(async (share) => {
        const car = await ctx.db.get(share.carId);
        // Only include non-archived shared cars
        return car && !car.isArchived ? { ...car, isShared: true, shareRole: share.role } : null;
      })
    );

    const allCars = [
      ...ownedCars.map(car => ({ ...car, isShared: false, shareRole: "owner" as const })),
      ...sharedCars.filter(Boolean)
    ];

    return allCars;
  },
});

// Get a specific car by ID (if user has access)
export const getCar = query({
  args: { carId: v.id("cars") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Check if user owns the car or has shared access
    const hasAccess = car.ownerId === userId ||
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    return car;
  },
});

// Create a new car
export const createCar = mutation({
  args: {
    make: v.string(),
    model: v.string(),
    trim: v.optional(v.string()),
    year: v.number(),
    nickname: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const carId = await ctx.db.insert("cars", {
      ...args,
      ownerId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return carId;
  },
});

// Update car basic info
export const updateCarBasicInfo = mutation({
  args: {
    carId: v.id("cars"),
    make: v.string(),
    model: v.string(),
    trim: v.optional(v.string()),
    year: v.number(),
    nickname: v.optional(v.string()),
    vin: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Check access (owner or shared user can update basic info)
    const hasAccess = car.ownerId === userId ||
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const { carId, ...updateData } = args;
    await ctx.db.patch(carId, {
      ...updateData,
      updatedAt: Date.now(),
    });
  },
});

// Update car purchase details
export const updateCarPurchaseDetails = mutation({
  args: {
    carId: v.id("cars"),
    purchaseDate: v.optional(v.number()),
    purchaseMileage: v.optional(v.number()),
    baseMsrp: v.optional(v.number()),
    baseMsrpFeatures: v.optional(v.array(v.string())),
    optionalPackages: v.optional(v.array(v.object({
      name: v.string(),
      price: v.number(),
      features: v.optional(v.array(v.string()))
    }))),
    destinationDelivery: v.optional(v.number()),
    dealershipAccessories: v.optional(v.array(v.object({
      name: v.string(),
      price: v.number()
    }))),
    actualPurchasePrice: v.optional(v.number()),
    discount: v.optional(v.number()),
    dealershipFees: v.optional(v.array(v.object({
      name: v.string(),
      amount: v.number()
    }))),
    downPayments: v.optional(v.array(v.object({
      type: v.union(v.literal("check"), v.literal("credit_card"), v.literal("cash"), v.literal("other")),
      amount: v.number(),
      description: v.optional(v.string())
    }))),
    tradeInValue: v.optional(v.number()),
    tradeInMake: v.optional(v.string()),
    tradeInModel: v.optional(v.string()),
    tradeInTrim: v.optional(v.string()),
    tradeInYear: v.optional(v.number()),
    tradeInVin: v.optional(v.string()),
    tradeInMileage: v.optional(v.number()),
    salesperson: v.optional(v.object({
      name: v.string(),
      dealership: v.string(),
      address: v.string(),
      phone: v.optional(v.string()),
      email: v.optional(v.string())
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Only owner can update purchase details
    if (car.ownerId !== userId) {
      throw new Error("Only the owner can update purchase details");
    }

    const { carId, ...updateData } = args;
    await ctx.db.patch(carId, {
      ...updateData,
      updatedAt: Date.now(),
    });
  },
});

// Update car loan details
export const updateCarLoanDetails = mutation({
  args: {
    carId: v.id("cars"),
    loanAmount: v.optional(v.number()),
    loanTerm: v.optional(v.number()),
    interestRate: v.optional(v.number()),
    monthlyPayment: v.optional(v.number()),
    loanBank: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Only owner can update loan details
    if (car.ownerId !== userId) {
      throw new Error("Only the owner can update loan details");
    }

    const { carId, ...updateData } = args;
    await ctx.db.patch(carId, {
      ...updateData,
      updatedAt: Date.now(),
    });
  },
});

// Archive a car
export const archiveCar = mutation({
  args: {
    carId: v.id("cars"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Only owner can archive car
    if (car.ownerId !== userId) {
      throw new Error("Only the owner can archive this car");
    }

    await ctx.db.patch(args.carId, {
      isArchived: true,
      archivedAt: Date.now(),
      archivedReason: args.reason,
      updatedAt: Date.now(),
    });
  },
});

// Mark car as totaled
export const markCarAsTotaled = mutation({
  args: {
    carId: v.id("cars"),
    totalLossDate: v.number(),
    totalLossMileage: v.number(),
    insuranceCompany: v.optional(v.string()),
    claimNumber: v.optional(v.string()),
    insurancePayout: v.optional(v.number()),
    accidentDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Only owner can mark car as totaled
    if (car.ownerId !== userId) {
      throw new Error("Only the owner can mark this car as totaled");
    }

    await ctx.db.patch(args.carId, {
      totalLossDate: args.totalLossDate,
      totalLossMileage: args.totalLossMileage,
      insuranceCompany: args.insuranceCompany,
      claimNumber: args.claimNumber,
      insurancePayout: args.insurancePayout,
      accidentDescription: args.accidentDescription,
      isArchived: true,
      archivedAt: Date.now(),
      archivedReason: "totaled",
      updatedAt: Date.now(),
    });
  },
});

// Mark car as sold
export const markCarAsSold = mutation({
  args: {
    carId: v.id("cars"),
    salePrice: v.number(),
    saleMileage: v.number(),
    buyerInfo: v.object({
      businessName: v.optional(v.string()),
      personName: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Only owner can mark car as sold
    if (car.ownerId !== userId) {
      throw new Error("Only the owner can mark this car as sold");
    }

    await ctx.db.patch(args.carId, {
      salePrice: args.salePrice,
      saleMileage: args.saleMileage,
      buyerInfo: args.buyerInfo,
      isArchived: true,
      archivedAt: Date.now(),
      archivedReason: "sold",
      updatedAt: Date.now(),
    });
  },
});

// Share a car with another user
export const shareCar = mutation({
  args: {
    carId: v.id("cars"),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Only owner can share
    if (car.ownerId !== userId) {
      throw new Error("Only the owner can share this car");
    }

    // Find user by email
    const targetUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.userEmail))
      .unique();

    if (!targetUser) {
      throw new Error("User not found");
    }

    // Check if already shared
    const existingShare = await ctx.db
      .query("carShares")
      .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", targetUser._id))
      .unique();

    if (existingShare) {
      throw new Error("Car is already shared with this user");
    }

    await ctx.db.insert("carShares", {
      carId: args.carId,
      userId: targetUser._id,
      role: "shared",
      sharedAt: Date.now(),
      sharedBy: userId,
    });
  },
});

// Remove car sharing
export const unshareCar = mutation({
  args: {
    carId: v.id("cars"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Only owner can unshare
    if (car.ownerId !== currentUserId) {
      throw new Error("Only the owner can unshare this car");
    }

    const share = await ctx.db
      .query("carShares")
      .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", args.userId))
      .unique();

    if (share) {
      await ctx.db.delete(share._id);
    }
  },
});

// Get archived cars for the current user
export const getArchivedCars = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const archivedCars = await ctx.db
      .query("cars")
      .withIndex("by_owner_active", (q) => q.eq("ownerId", userId).eq("isArchived", true))
      .collect();

    return archivedCars;
  },
});

// Get available cars for trade-in (excluding the current car being edited)
export const getAvailableCarsForTradeIn = query({
  args: { excludeCarId: v.id("cars") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get cars owned by user (not archived, excluding current car)
    const availableCars = await ctx.db
      .query("cars")
      .withIndex("by_owner_active", (q) => q.eq("ownerId", userId).eq("isArchived", undefined))
      .filter((q) => q.neq(q.field("_id"), args.excludeCarId))
      .collect();

    return availableCars;
  },
});

export const getCarUsers = query({
  args: { carId: v.id("cars") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Check access
    const hasAccess = car.ownerId === userId ||
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Get owner
    const owner = await ctx.db.get(car.ownerId);
    const users: Array<{
      _id: Id<"users">;
      _creationTime: number;
      name?: string;
      email?: string;
      phone?: string;
      image?: string;
      emailVerificationTime?: number;
      phoneVerificationTime?: number;
      isAnonymous?: boolean;
      role: "owner" | "shared";
    }> = owner ? [{ ...owner, role: "owner" as const }] : [];

    // Get shared users
    const shares = await ctx.db
      .query("carShares")
      .withIndex("by_car", (q) => q.eq("carId", args.carId))
      .collect();

    for (const share of shares) {
      const user = await ctx.db.get(share.userId);
      if (user) {
        users.push({ ...user, role: share.role });
      }
    }

    return users;
  },
});

// Calculate next loan payment due date and amount with improved logic
export const getNextLoanPayment = query({
  args: { carId: v.id("cars") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Check access
    const hasAccess = car.ownerId === userId ||
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Check if car has loan info
    if (!car.loanAmount || !car.monthlyPayment || !car.purchaseDate || !car.loanTerm) {
      return null;
    }

    // Get all loan payments made so far
    const loanPayments = await ctx.db
      .query("expenses")
      .withIndex("by_car_category", (q) => q.eq("carId", args.carId).eq("category", "loan_payment"))
      .collect();

    // Calculate remaining balance using simple interest method
    let currentBalance = car.loanAmount;
    let lastPaymentDate = car.purchaseDate;
    const monthlyInterestRate = (car.interestRate || 0) / 100 / 12;

    // Sort payments by date
    loanPayments.sort((a, b) => a.date - b.date);

    // Process each payment chronologically
    for (const payment of loanPayments) {
      const monthsElapsed = Math.max(0, (payment.date - lastPaymentDate) / (1000 * 60 * 60 * 24 * 30.44));
      const interestAccrued = currentBalance * monthlyInterestRate * monthsElapsed;
      const interestPortion = Math.min(payment.amount, interestAccrued);
      const principalPortion = Math.max(0, payment.amount - interestPortion);
      currentBalance = Math.max(0, currentBalance - principalPortion);
      lastPaymentDate = payment.date;
    }

    // Round to nearest cent and check if paid off
    const remainingBalance = Math.round(currentBalance * 100) / 100;

    if (remainingBalance <= 0.01) { // Consider paid off if less than 1 cent
      return { isPaidOff: true };
    }

    // Find the next payment due date by checking which months have been paid
    const purchaseDate = new Date(car.purchaseDate);

    // Create a set of months that have payments
    const paidMonths = new Set<string>();
    loanPayments.forEach(payment => {
      const paymentDate = new Date(payment.date);
      const monthKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
      paidMonths.add(monthKey);
    });
    // Find the first unpaid month
    let nextDueDate: Date | null = null;
    let paymentNumber = 0;

    for (let monthOffset = 1; monthOffset <= car.loanTerm; monthOffset++) {
      const dueDate = new Date(purchaseDate);
      dueDate.setMonth(dueDate.getMonth() + monthOffset);

      const monthKey = `${dueDate.getFullYear()}-${dueDate.getMonth()}`;

      if (!paidMonths.has(monthKey)) {
        nextDueDate = dueDate;
        paymentNumber = monthOffset;
        break;
      }
    }

    // If no unpaid months found, the loan should be paid off
    if (!nextDueDate) {
      return { isPaidOff: true };
    }

    // Calculate payments made in current period
    const currentPeriodStart = new Date(nextDueDate);
    currentPeriodStart.setMonth(currentPeriodStart.getMonth() - 1);

    const paymentsThisPeriod = loanPayments.filter(payment => {
      const paymentDate = new Date(payment.date);
      return paymentDate > currentPeriodStart && paymentDate <= nextDueDate;
    });

    const paidThisPeriod = paymentsThisPeriod.reduce((sum, payment) => sum + payment.amount, 0);

    // If remaining balance is less than monthly payment, the amount due should be the remaining balance
    // Otherwise, it's the monthly payment minus what's already been paid this period
    let amountDue: number;
    if (remainingBalance < car.monthlyPayment) {
      amountDue = Math.max(0, remainingBalance - paidThisPeriod);
    } else {
      amountDue = Math.max(0, car.monthlyPayment - paidThisPeriod);
    }

    // Check if payment is overdue
    const currentDate = new Date();
    const isOverdue = currentDate > nextDueDate;

    return {
      isPaidOff: false,
      nextDueDate: nextDueDate.getTime(),
      monthlyPayment: car.monthlyPayment,
      amountDue: Math.round(amountDue * 100) / 100,
      paidThisPeriod: Math.round(paidThisPeriod * 100) / 100,
      remainingBalance: remainingBalance,
      paymentNumber: paymentNumber,
      isOverdue: isOverdue
    };
  },
});

// Get loan payment history and summary with improved calculations
export const getLoanDetails = query({
  args: { carId: v.id("cars") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Check access
    const hasAccess = car.ownerId === userId ||
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Check if car has loan info
    if (!car.loanAmount || !car.monthlyPayment || !car.loanTerm) {
      return null;
    }

    // Get all loan payments
    const loanPayments = await ctx.db
      .query("expenses")
      .withIndex("by_car_category", (q) => q.eq("carId", args.carId).eq("category", "loan_payment"))
      .collect();

    // Sort payments by date
    loanPayments.sort((a, b) => a.date - b.date);

    // Calculate totals
    const totalPaid = loanPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPrincipal = loanPayments.reduce((sum, payment) => sum + (payment.principalAmount || 0), 0);
    const totalInterest = loanPayments.reduce((sum, payment) => sum + (payment.interestAmount || 0), 0);

    // Calculate remaining balance using simple interest method
    let currentBalance = car.loanAmount;
    let lastPaymentDate = car.purchaseDate || Date.now();
    const monthlyInterestRate = (car.interestRate || 0) / 100 / 12;

    // Process each payment chronologically to get accurate remaining balance
    for (const payment of loanPayments) {
      const monthsElapsed = Math.max(0, (payment.date - lastPaymentDate) / (1000 * 60 * 60 * 24 * 30.44));
      const interestAccrued = currentBalance * monthlyInterestRate * monthsElapsed;
      const interestPortion = Math.min(payment.amount, interestAccrued);
      const principalPortion = Math.max(0, payment.amount - interestPortion);
      currentBalance = Math.max(0, currentBalance - principalPortion);
      lastPaymentDate = payment.date;
    }

    // Add any interest that has accrued since the last payment to current date
    const currentDate = Date.now();
    const monthsElapsed = Math.max(0, (currentDate - lastPaymentDate) / (1000 * 60 * 60 * 24 * 30.44));
    const accruedInterestSinceLastPayment = currentBalance * monthlyInterestRate * monthsElapsed;
    const remainingBalance = Math.round((currentBalance + accruedInterestSinceLastPayment) * 100) / 100;

    // Calculate if loan is paid off early
    const isPaidOff = remainingBalance <= 0.01; // Consider paid off if less than 1 cent
    let monthsEarly = 0;

    if (isPaidOff && car.purchaseDate) {
      const purchaseDate = new Date(car.purchaseDate);
      const lastPaymentDate = loanPayments.length > 0 ? new Date(loanPayments[loanPayments.length - 1].date) : new Date();
      const scheduledEndDate = new Date(purchaseDate);
      scheduledEndDate.setMonth(scheduledEndDate.getMonth() + car.loanTerm);

      if (lastPaymentDate < scheduledEndDate) {
        const monthsDiff = (scheduledEndDate.getFullYear() - lastPaymentDate.getFullYear()) * 12 +
                          (scheduledEndDate.getMonth() - lastPaymentDate.getMonth());
        monthsEarly = Math.max(0, monthsDiff);
      }
    }

    // Calculate next payment due date if not paid off and has purchase date
    let nextPaymentDate: number | null = null;
    let isOverdue = false;

    if (!isPaidOff && car.purchaseDate) {
      const purchaseDate = new Date(car.purchaseDate);
      const currentDate = new Date();

      // Create a set of months that have payments
      const paidMonths = new Set<string>();
      loanPayments.forEach(payment => {
        const paymentDate = new Date(payment.date);
        const monthKey = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
        paidMonths.add(monthKey);
      });

      // Find the first unpaid month
      for (let monthOffset = 1; monthOffset <= car.loanTerm; monthOffset++) {
        const dueDate = new Date(purchaseDate);
        dueDate.setMonth(dueDate.getMonth() + monthOffset);

        const monthKey = `${dueDate.getFullYear()}-${dueDate.getMonth()}`;

        if (!paidMonths.has(monthKey)) {
          nextPaymentDate = dueDate.getTime();
          isOverdue = currentDate > dueDate;
          break;
        }
      }
    }

    return {
      originalLoanAmount: car.loanAmount,
      loanTerm: car.loanTerm,
      interestRate: car.interestRate || 0,
      monthlyPayment: car.monthlyPayment,
      loanBank: car.loanBank,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPrincipal: Math.round(totalPrincipal * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      remainingBalance: Math.max(0, remainingBalance),
      isPaidOff,
      monthsEarly,
      nextPaymentDate,
      isOverdue,
      payments: loanPayments.map(payment => ({
        _id: payment._id,
        date: payment.date,
        amount: Math.round(payment.amount * 100) / 100,
        principalAmount: Math.round((payment.principalAmount || 0) * 100) / 100,
        interestAmount: Math.round((payment.interestAmount || 0) * 100) / 100,
      }))
    };
  },
});

// Add a buyer accessory to a car
export const addBuyerAccessory = mutation({
  args: {
    carId: v.id("cars"),
    name: v.string(),
    price: v.number(),
    dateAdded: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Check access (owner or shared user can add accessories)
    const hasAccess = car.ownerId === userId ||
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const currentAccessories = car.buyerAccessories || [];
    const newAccessory = {
      name: args.name,
      price: args.price,
      dateAdded: args.dateAdded,
    };

    await ctx.db.patch(args.carId, {
      buyerAccessories: [...currentAccessories, newAccessory],
      updatedAt: Date.now(),
    });

    // Also create an expense entry for this accessory
    await ctx.db.insert("expenses", {
      carId: args.carId,
      userId: userId,
      category: "accessories",
      description: `Buyer accessory: ${args.name}`,
      amount: args.price,
      date: args.dateAdded,
      createdAt: Date.now(),
    });
  },
});

// Update a buyer accessory
export const updateBuyerAccessory = mutation({
  args: {
    carId: v.id("cars"),
    accessoryIndex: v.number(),
    name: v.string(),
    price: v.number(),
    dateAdded: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Check access (owner or shared user can update accessories)
    const hasAccess = car.ownerId === userId ||
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const currentAccessories = car.buyerAccessories || [];
    if (args.accessoryIndex < 0 || args.accessoryIndex >= currentAccessories.length) {
      throw new Error("Invalid accessory index");
    }

    const oldAccessory = currentAccessories[args.accessoryIndex];
    const updatedAccessories = [...currentAccessories];
    updatedAccessories[args.accessoryIndex] = {
      name: args.name,
      price: args.price,
      dateAdded: args.dateAdded,
    };

    await ctx.db.patch(args.carId, {
      buyerAccessories: updatedAccessories,
      updatedAt: Date.now(),
    });

    // Find and update the corresponding expense entry
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_car_category", (q) => q.eq("carId", args.carId).eq("category", "accessories"))
      .filter((q) => q.eq(q.field("description"), `Buyer accessory: ${oldAccessory.name}`))
      .collect();

    // Update the most recent matching expense
    if (expenses.length > 0) {
      const expenseToUpdate = expenses.sort((a, b) => b.date - a.date)[0];
      await ctx.db.patch(expenseToUpdate._id, {
        description: `Buyer accessory: ${args.name}`,
        amount: args.price,
        date: args.dateAdded,
      });
    }
  },
});

// Remove a buyer accessory
export const removeBuyerAccessory = mutation({
  args: {
    carId: v.id("cars"),
    accessoryIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    // Check access (owner or shared user can remove accessories)
    const hasAccess = car.ownerId === userId ||
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const currentAccessories = car.buyerAccessories || [];
    if (args.accessoryIndex < 0 || args.accessoryIndex >= currentAccessories.length) {
      throw new Error("Invalid accessory index");
    }

    const accessoryToRemove = currentAccessories[args.accessoryIndex];
    const updatedAccessories = currentAccessories.filter((_, index) => index !== args.accessoryIndex);

    await ctx.db.patch(args.carId, {
      buyerAccessories: updatedAccessories,
      updatedAt: Date.now(),
    });

    // Find and remove the corresponding expense entry
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_car_category", (q) => q.eq("carId", args.carId).eq("category", "accessories"))
      .filter((q) => q.eq(q.field("description"), `Buyer accessory: ${accessoryToRemove.name}`))
      .collect();

    // Remove the most recent matching expense
    if (expenses.length > 0) {
      const expenseToRemove = expenses.sort((a, b) => b.date - a.date)[0];
      await ctx.db.delete(expenseToRemove._id);
    }
  },
});
