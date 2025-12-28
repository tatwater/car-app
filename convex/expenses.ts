import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all expenses for a specific car
export const getCarExpenses = query({
  args: { carId: v.id("cars") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has access to this car
    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    const hasAccess = car.ownerId === userId || 
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_car_date", (q) => q.eq("carId", args.carId))
      .order("desc")
      .collect();

    return expenses;
  },
});

// Get expense summary for a car
export const getExpenseSummary = query({
  args: { carId: v.id("cars") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has access to this car
    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    const hasAccess = car.ownerId === userId || 
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_car", (q) => q.eq("carId", args.carId))
      .collect();

    // Calculate total from recorded expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Add down payments from car's purchase details
    const downPaymentsTotal = car.downPayments 
      ? car.downPayments.reduce((sum, payment) => sum + payment.amount, 0)
      : 0;

    // Calculate category breakdown
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    // Add down payments as a separate category if they exist
    if (downPaymentsTotal > 0) {
      categoryTotals["down_payments"] = downPaymentsTotal;
    }

    return {
      totalExpenses: totalExpenses + downPaymentsTotal,
      categoryTotals,
      expenseCount: expenses.length,
    };
  },
});

// Add a new expense
export const addExpense = mutation({
  args: {
    carId: v.id("cars"),
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
      v.literal("loan_payment"),
      v.literal("other")
    ),
    amount: v.number(),
    description: v.string(),
    date: v.number(),
    mileage: v.optional(v.number()),
    location: v.optional(v.string()),
    principalAmount: v.optional(v.number()),
    interestAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has access to this car
    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    const hasAccess = car.ownerId === userId || 
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const expenseId = await ctx.db.insert("expenses", {
      carId: args.carId,
      userId,
      category: args.category,
      amount: args.amount,
      description: args.description,
      date: args.date,
      mileage: args.mileage,
      location: args.location,
      principalAmount: args.principalAmount,
      interestAmount: args.interestAmount,
      createdAt: Date.now(),
    });

    return expenseId;
  },
});

// Update an expense
export const updateExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
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
      v.literal("loan_payment"),
      v.literal("other")
    ),
    amount: v.number(),
    description: v.string(),
    date: v.number(),
    mileage: v.optional(v.number()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }

    // Check if user has access to this car
    const car = await ctx.db.get(expense.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    const hasAccess = car.ownerId === userId || 
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", expense.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    await ctx.db.patch(args.expenseId, {
      category: args.category,
      amount: args.amount,
      description: args.description,
      date: args.date,
      mileage: args.mileage,
      location: args.location,
    });
  },
});

// Delete an expense
export const deleteExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }

    // Check if user has access to this car
    const car = await ctx.db.get(expense.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    const hasAccess = car.ownerId === userId || 
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", expense.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    await ctx.db.delete(args.expenseId);
  },
});

// Get expenses by category for a car
export const getExpensesByCategory = query({
  args: { 
    carId: v.id("cars"),
    category: v.union(
      v.literal("fuel"),
      v.literal("maintenance"),
      v.literal("repair"),
      v.literal("insurance"),
      v.literal("registration"),
      v.literal("parking"),
      v.literal("tolls"),
      v.literal("accessories"),
      v.literal("loan_payment"),
      v.literal("other")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has access to this car
    const car = await ctx.db.get(args.carId);
    if (!car) {
      throw new Error("Car not found");
    }

    const hasAccess = car.ownerId === userId || 
      await ctx.db
        .query("carShares")
        .withIndex("by_car_user", (q) => q.eq("carId", args.carId).eq("userId", userId))
        .unique();

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_car_category", (q) => q.eq("carId", args.carId).eq("category", args.category))
      .order("desc")
      .collect();

    return expenses;
  },
});

// Get total expenses across all cars for the user
export const getTotalUserExpenses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get all cars user has access to
    const ownedCars = await ctx.db
      .query("cars")
      .withIndex("by_owner_active", (q) => q.eq("ownerId", userId).eq("isArchived", undefined))
      .collect();

    const sharedCarIds = await ctx.db
      .query("carShares")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sharedCars = await Promise.all(
      sharedCarIds.map(async (share) => {
        const car = await ctx.db.get(share.carId);
        return car && !car.isArchived ? car : null;
      })
    );

    const allCars = [...ownedCars, ...sharedCars.filter(Boolean)];
    
    let totalExpenses = 0;
    let totalDownPayments = 0;

    // Calculate expenses for each car
    for (const car of allCars) {
      if (car) {
        const expenses = await ctx.db
          .query("expenses")
          .withIndex("by_car", (q) => q.eq("carId", car._id))
          .collect();

        totalExpenses += expenses.reduce((sum, expense) => sum + expense.amount, 0);

        // Add down payments from car's purchase details
        if (car.downPayments) {
          totalDownPayments += car.downPayments.reduce((sum, payment) => sum + payment.amount, 0);
        }
      }
    }

    return {
      totalExpenses: totalExpenses + totalDownPayments,
      carCount: allCars.length,
    };
  },
});
