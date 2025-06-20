var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import dotenv3 from "dotenv";
import express2 from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import dotenv from "dotenv";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accessTokens: () => accessTokens,
  adminLoginSchema: () => adminLoginSchema,
  deviceSessions: () => deviceSessions,
  feedback: () => feedback,
  insertFeedbackSchema: () => insertFeedbackSchema,
  insertProductSchema: () => insertProductSchema,
  insertUserSchema: () => insertUserSchema,
  insertWishlistSchema: () => insertWishlistSchema,
  otpVerifications: () => otpVerifications,
  products: () => products,
  productsRelations: () => productsRelations,
  users: () => users,
  usersRelations: () => usersRelations,
  wishlists: () => wishlists,
  wishlistsRelations: () => wishlistsRelations
});
import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  whatsappNumber: text("whatsapp_number").notNull().unique(),
  email: text("email"),
  password: text("password"),
  city: text("city"),
  isAdmin: boolean("is_admin").default(false),
  isPrimaryAdmin: boolean("is_primary_admin").default(false),
  profileCompleted: boolean("profile_completed").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var accessTokens = pgTable("access_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  isUsed: boolean("is_used").default(false),
  ipAddress: text("ip_address"),
  deviceFingerprint: text("device_fingerprint"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var deviceSessions = pgTable("device_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenId: integer("token_id").references(() => accessTokens.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address").notNull(),
  deviceFingerprint: text("device_fingerprint").notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  lastAccessAt: timestamp("last_access_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});
var otpVerifications = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  tokenId: integer("token_id").references(() => accessTokens.id, { onDelete: "cascade" }),
  otpCode: text("otp_code").notNull(),
  attempts: integer("attempts").default(0),
  isVerified: boolean("is_verified").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow()
});
var products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  category: text("category").notNull(),
  length: real("length").notNull(),
  // in cm
  breadth: real("breadth").notNull(),
  // in cm
  height: real("height").notNull(),
  // in cm
  finish: text("finish").notNull(),
  material: text("material").default("").notNull(),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls").array(),
  // Multiple images
  description: text("description"),
  // Product description
  status: text("status").default("active"),
  // active, inactive, draft
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var wishlists = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  rating: integer("rating").notNull(),
  // 1-5 stars
  title: text("title").notNull(),
  message: text("message").notNull(),
  isApproved: boolean("is_approved").default(false),
  isPublished: boolean("is_published").default(false),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  wishlists: many(wishlists)
}));
var productsRelations = relations(products, ({ many }) => ({
  wishlists: many(wishlists)
}));
var wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id]
  }),
  product: one(products, {
    fields: [wishlists.productId],
    references: [products.id]
  })
}));
var insertUserSchema = createInsertSchema(users).pick({
  name: true,
  whatsappNumber: true,
  city: true
});
var adminLoginSchema = z.object({
  whatsappNumber: z.string().min(1),
  password: z.string().min(6)
});
var insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertWishlistSchema = createInsertSchema(wishlists).omit({
  id: true,
  createdAt: true
});
var insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/db.ts
import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var { Pool } = pkg;
var isDev = process.env.NODE_ENV === "development";
var pool = null;
var db;
if (isDev && !process.env.DATABASE_URL) {
  console.warn("Running with mock database for local development");
  pool = null;
  db = {
    query: async () => [],
    select: () => ({ from: () => [] }),
    insert: () => ({ values: () => ({ returning: () => [] }) }),
    delete: () => ({ where: () => ({ returning: () => [] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) })
  };
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?"
    );
  }
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? {
      rejectUnauthorized: false
    } : false
  });
  db = drizzle({ client: pool, schema: schema_exports });
}

// server/storage.ts
import { eq, or, sql, and, desc, asc, lt } from "drizzle-orm";
dotenv.config();
var MemStorage = class {
  users;
  products;
  wishlists;
  accessTokens;
  deviceSessions;
  otpVerifications;
  currentUserId;
  currentProductId;
  currentWishlistId;
  currentTokenId;
  currentSessionId;
  currentOtpId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.products = /* @__PURE__ */ new Map();
    this.wishlists = /* @__PURE__ */ new Map();
    this.accessTokens = /* @__PURE__ */ new Map();
    this.deviceSessions = /* @__PURE__ */ new Map();
    this.otpVerifications = /* @__PURE__ */ new Map();
    this.currentUserId = 1;
    this.currentProductId = 1;
    this.currentWishlistId = 1;
    this.currentTokenId = 1;
    this.currentSessionId = 1;
    this.currentOtpId = 1;
    this.initializeSampleData();
  }
  async initializeSampleData() {
    const adminWhatsApp = "+918882636296";
    console.log("Creating admin user with WhatsApp:", adminWhatsApp);
    const bcrypt2 = await import("bcrypt");
    const hashedPassword = await bcrypt2.hash("admin123", 10);
    const adminUser = {
      id: this.currentUserId++,
      name: "Admin User",
      whatsappNumber: adminWhatsApp,
      email: "admin@vmakefinessee.com",
      password: hashedPassword,
      isAdmin: true,
      isPrimaryAdmin: true,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.users.set(adminUser.id, adminUser);
    console.log("Admin user created:", { id: adminUser.id, whatsappNumber: adminUser.whatsappNumber, password: "admin123" });
    const sampleProducts = [
      {
        name: "Handcrafted Brass Ganesha Idol",
        code: "VF-BG-001",
        category: "Brass Idols",
        length: 15,
        breadth: 12,
        height: 20,
        finish: "Antique Brass",
        material: "Pure Brass",
        imageUrl: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        imageUrls: [
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80",
          "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=90"
        ],
        description: "Exquisitely handcrafted brass Ganesha idol with intricate detailing. Perfect for home temples and spiritual spaces. Made by skilled artisans using traditional techniques."
      },
      {
        name: "Decorative Brass Bowl Set",
        code: "VF-BB-002",
        category: "Home Decor",
        length: 25,
        breadth: 25,
        height: 8,
        finish: "Polished Brass",
        material: "Pure Brass",
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        imageUrls: [
          "https://images.unsplash.com/photo-1549497538-303791108f95?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80"
        ],
        description: "Set of 3 decorative brass bowls with traditional engravings. Ideal for serving dry fruits, sweets, or as decorative pieces."
      },
      {
        name: "Brass Diya Oil Lamp",
        code: "VF-DL-003",
        category: "Lighting",
        length: 10,
        breadth: 10,
        height: 5,
        finish: "Traditional Brass",
        material: "Pure Brass",
        imageUrl: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        imageUrls: [
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=85"
        ],
        description: "Traditional brass diya perfect for festivals and daily prayers. Handcrafted with beautiful patterns and smooth finish."
      },
      {
        name: "Ornate Brass Kalash",
        code: "VF-BK-004",
        category: "Religious Items",
        length: 12,
        breadth: 12,
        height: 18,
        finish: "Engraved Brass",
        material: "Pure Brass",
        imageUrl: "https://images.unsplash.com/photo-1549497538-303791108f95?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        imageUrls: [
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
          "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80",
          "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=85"
        ],
        description: "Sacred brass kalash with intricate engravings. Essential for religious ceremonies and puja rituals. Comes with detailed craftsmanship."
      },
      {
        name: "Conference Table",
        code: "VF-CT-005",
        category: "Tables",
        length: 300,
        breadth: 120,
        height: 75,
        finish: "Mahogany",
        material: "Mahogany Wood",
        imageUrl: "https://images.unsplash.com/photo-1549497538-303791108f95?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
      },
      {
        name: "Modular Bookshelf",
        code: "VF-BS-006",
        category: "Storage",
        length: 100,
        breadth: 30,
        height: 200,
        finish: "White Oak",
        material: "White Oak & Metal",
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
      },
      {
        name: "Premium Lounge Chair",
        code: "VF-LC-007",
        category: "Chairs",
        length: 80,
        breadth: 85,
        height: 95,
        finish: "Gray Fabric",
        material: "Premium Fabric & Wood",
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
      },
      {
        name: "Modern Side Table",
        code: "VF-ST-008",
        category: "Tables",
        length: 45,
        breadth: 45,
        height: 55,
        finish: "Wood & Metal",
        material: "Engineered Wood & Steel",
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"
      }
    ];
    sampleProducts.forEach((product) => {
      const newProduct = {
        ...product,
        id: this.currentProductId++,
        material: product.material || "",
        imageUrl: product.imageUrl || null,
        imageUrls: product.imageUrls || null,
        description: product.description || null,
        status: product.status || null,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      this.products.set(newProduct.id, newProduct);
    });
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByWhatsApp(whatsappNumber) {
    return Array.from(this.users.values()).find(
      (user) => user.whatsappNumber === whatsappNumber
    );
  }
  async getUserByEmail(email) {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = {
      ...insertUser,
      id,
      password: null,
      isAdmin: false,
      isPrimaryAdmin: false,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.users.set(id, user);
    await this.logUserData(user);
    return user;
  }
  async logUserData(user) {
    try {
      const fs3 = await import("fs");
      const path4 = await import("path");
      const userData = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        name: user.name,
        whatsappNumber: user.whatsappNumber,
        id: user.id
      };
      const logEntry = JSON.stringify(userData) + "\n";
      const logPath = path4.join(process.cwd(), "user_data_log.txt");
      fs3.appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error("Error logging user data:", error);
    }
  }
  async getProducts() {
    return Array.from(this.products.values());
  }
  async getProduct(id) {
    return this.products.get(id);
  }
  async getProductByCode(code) {
    return Array.from(this.products.values()).find(
      (product) => product.code === code
    );
  }
  async createProduct(insertProduct) {
    const id = this.currentProductId++;
    const product = {
      ...insertProduct,
      id,
      material: insertProduct.material || "",
      imageUrl: insertProduct.imageUrl || null,
      imageUrls: insertProduct.imageUrls || null,
      description: insertProduct.description || null,
      status: insertProduct.status || null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.products.set(id, product);
    return product;
  }
  async updateProduct(id, updateData) {
    const existing = this.products.get(id);
    if (!existing) return void 0;
    const updated = {
      ...existing,
      ...updateData,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.products.set(id, updated);
    return updated;
  }
  async deleteProduct(id) {
    return this.products.delete(id);
  }
  async searchProducts(query, limit, offset) {
    const lowercaseQuery = query.toLowerCase();
    let results = Array.from(this.products.values()).filter(
      (product) => product.name.toLowerCase().includes(lowercaseQuery) || product.code.toLowerCase().includes(lowercaseQuery) || product.category.toLowerCase().includes(lowercaseQuery) || product.finish.toLowerCase().includes(lowercaseQuery)
    );
    if (offset !== void 0) {
      results = results.slice(offset);
    }
    if (limit !== void 0) {
      results = results.slice(0, limit);
    }
    return results;
  }
  async getSearchCount(query) {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.products.values()).filter(
      (product) => product.name.toLowerCase().includes(lowercaseQuery) || product.code.toLowerCase().includes(lowercaseQuery) || product.category.toLowerCase().includes(lowercaseQuery) || product.finish.toLowerCase().includes(lowercaseQuery)
    ).length;
  }
  async filterProducts(filters) {
    let products2 = Array.from(this.products.values());
    if (filters.category) {
      products2 = products2.filter((p) => p.category === filters.category);
    }
    if (filters.finish) {
      products2 = products2.filter((p) => p.finish === filters.finish);
    }
    if (filters.material) {
      products2 = products2.filter((p) => p.material === filters.material);
    }
    switch (filters.sortBy) {
      case "code":
        products2.sort((a, b) => a.code.localeCompare(b.code));
        break;
      case "category":
        products2.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "newest":
        products2.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        products2.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (filters.offset !== void 0) {
      products2 = products2.slice(filters.offset);
    }
    if (filters.limit !== void 0) {
      products2 = products2.slice(0, filters.limit);
    }
    return products2;
  }
  async getFilterCount(filters) {
    let products2 = Array.from(this.products.values());
    if (filters.category) {
      products2 = products2.filter((p) => p.category === filters.category);
    }
    if (filters.finish) {
      products2 = products2.filter((p) => p.finish === filters.finish);
    }
    if (filters.material) {
      products2 = products2.filter((p) => p.material === filters.material);
    }
    return products2.length;
  }
  async bulkCreateProducts(insertProducts) {
    const products2 = [];
    for (const insertProduct of insertProducts) {
      const id = this.currentProductId++;
      const product = {
        ...insertProduct,
        id,
        material: insertProduct.material || "",
        imageUrl: insertProduct.imageUrl || null,
        imageUrls: insertProduct.imageUrls || null,
        description: insertProduct.description || null,
        status: insertProduct.status || null,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      this.products.set(id, product);
      products2.push(product);
    }
    return products2;
  }
  async getWishlistByUser(userId) {
    const userWishlists = Array.from(this.wishlists.values()).filter(
      (wishlist) => wishlist.userId === userId
    );
    return userWishlists.map((wishlist) => {
      const product = this.products.get(wishlist.productId);
      if (!product) throw new Error(`Product not found for wishlist item`);
      return { ...wishlist, product };
    });
  }
  async addToWishlist(insertWishlist) {
    const id = this.currentWishlistId++;
    const wishlist = {
      ...insertWishlist,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.wishlists.set(id, wishlist);
    return wishlist;
  }
  async removeFromWishlist(userId, productId) {
    const wishlistItem = Array.from(this.wishlists.values()).find(
      (w) => w.userId === userId && w.productId === productId
    );
    if (!wishlistItem) return false;
    return this.wishlists.delete(wishlistItem.id);
  }
  async isInWishlist(userId, productId) {
    return Array.from(this.wishlists.values()).some(
      (w) => w.userId === userId && w.productId === productId
    );
  }
  // New methods for categories and finishes
  async getCategories() {
    const allProducts = Array.from(this.products.values());
    const categories = /* @__PURE__ */ new Set();
    allProducts.forEach((product) => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    return Array.from(categories);
  }
  async getFinishes() {
    const allProducts = Array.from(this.products.values());
    const finishes = /* @__PURE__ */ new Set();
    allProducts.forEach((product) => {
      if (product.finish) {
        finishes.add(product.finish);
      }
    });
    return Array.from(finishes);
  }
  async getMaterials() {
    const allProducts = Array.from(this.products.values());
    const materials = /* @__PURE__ */ new Set();
    allProducts.forEach((product) => {
      if (product.material) {
        materials.add(product.material);
      }
    });
    return Array.from(materials);
  }
  // Dynamic filter methods that return only available options based on current selections
  async getAvailableCategories(filters) {
    let products2 = Array.from(this.products.values());
    if (filters.finish) {
      products2 = products2.filter((p) => p.finish === filters.finish);
    }
    if (filters.material) {
      products2 = products2.filter((p) => p.material === filters.material);
    }
    const categories = /* @__PURE__ */ new Set();
    products2.forEach((product) => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    return Array.from(categories).sort();
  }
  async getAvailableFinishes(filters) {
    let products2 = Array.from(this.products.values());
    if (filters.category) {
      products2 = products2.filter((p) => p.category === filters.category);
    }
    if (filters.material) {
      products2 = products2.filter((p) => p.material === filters.material);
    }
    const finishes = /* @__PURE__ */ new Set();
    products2.forEach((product) => {
      if (product.finish) {
        finishes.add(product.finish);
      }
    });
    return Array.from(finishes).sort();
  }
  async getAvailableMaterials(filters) {
    let products2 = Array.from(this.products.values());
    if (filters.category) {
      products2 = products2.filter((p) => p.category === filters.category);
    }
    if (filters.finish) {
      products2 = products2.filter((p) => p.finish === filters.finish);
    }
    const materials = /* @__PURE__ */ new Set();
    products2.forEach((product) => {
      if (product.material) {
        materials.add(product.material);
      }
    });
    return Array.from(materials).sort();
  }
  // Add new method to get all users
  async getAllUsers() {
    return Array.from(this.users.values());
  }
  async updateUserPassword(id, password) {
    const user = this.users.get(id);
    if (!user) return false;
    user.password = password;
    this.users.set(id, user);
    return true;
  }
  async updateUser(id, data) {
    const user = this.users.get(id);
    if (!user) return void 0;
    if (data.isPrimaryAdmin !== void 0 && !user.isPrimaryAdmin) {
      data.isPrimaryAdmin = false;
    }
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }
  async deleteUser(id) {
    const user = this.users.get(id);
    if (!user || user.isPrimaryAdmin) return false;
    return this.users.delete(id);
  }
  // Security methods - simplified implementations for development
  async createAccessToken(email, userId) {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const tokenId = this.currentTokenId++;
    const accessToken = {
      id: tokenId,
      token,
      userId,
      email,
      isUsed: false,
      ipAddress: null,
      deviceFingerprint: null,
      expiresAt: null,
      // Never expires
      usedAt: null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.accessTokens.set(token, accessToken);
    console.log(`[DEV] Created access token for ${email}: ${token}`);
    return { token, tokenId };
  }
  async getAccessToken(token) {
    console.log(`[DEV] Getting access token: ${token}`);
    console.log(`[DEV] Available tokens:`, Array.from(this.accessTokens.keys()));
    const result = this.accessTokens.get(token) || null;
    console.log(`[DEV] Token found:`, result ? "YES" : "NO");
    return result;
  }
  async getAccessTokenById(tokenId) {
    console.log(`[DEV] Getting access token by ID: ${tokenId}`);
    for (const [token, accessToken] of this.accessTokens.entries()) {
      if (accessToken.id === tokenId) {
        return accessToken;
      }
    }
    return null;
  }
  async getAllAccessTokens() {
    console.log(`[DEV] Getting all access tokens`);
    return Array.from(this.accessTokens.values());
  }
  async linkTokenToUser(tokenId, userId) {
    console.log(`[DEV] Linking token ${tokenId} to user ${userId}`);
    for (const [token, accessToken] of this.accessTokens.entries()) {
      if (accessToken.id === tokenId) {
        accessToken.userId = userId;
        return true;
      }
    }
    return false;
  }
  async markTokenAsUsed(tokenId, ipAddress, deviceFingerprint) {
    console.log(`[DEV] Marking token ${tokenId} as used from ${ipAddress}`);
    for (const [token, accessToken] of this.accessTokens.entries()) {
      if (accessToken.id === tokenId) {
        accessToken.isUsed = true;
        accessToken.usedAt = /* @__PURE__ */ new Date();
        accessToken.ipAddress = ipAddress;
        accessToken.deviceFingerprint = deviceFingerprint;
        return true;
      }
    }
    return false;
  }
  async cleanupExpiredTokens() {
    console.log("[DEV] Cleaning up expired tokens");
  }
  async createDeviceSession(userId, tokenId, ipAddress, deviceFingerprint, userAgent) {
    console.log(`[DEV] Creating device session for user ${userId} from ${ipAddress}`);
    const sessionId = this.currentSessionId++;
    const session2 = {
      id: sessionId,
      userId,
      tokenId,
      ipAddress,
      deviceFingerprint,
      userAgent,
      isActive: true,
      lastAccessAt: /* @__PURE__ */ new Date(),
      createdAt: /* @__PURE__ */ new Date()
    };
    this.deviceSessions.set(sessionId, session2);
    return session2;
  }
  async getDeviceSession(userId, tokenId) {
    console.log(`[DEV] Getting device session for user ${userId}, token ${tokenId}`);
    for (const [id, session2] of this.deviceSessions.entries()) {
      if (session2.userId === userId && session2.tokenId === tokenId && session2.isActive) {
        return session2;
      }
    }
    return null;
  }
  async getDeviceSessionByFingerprint(deviceFingerprint, ipAddress, activeOnly = false) {
    console.log(`[DEV] Getting device session by fingerprint ${deviceFingerprint.substring(0, 8)}... from ${ipAddress} (activeOnly: ${activeOnly})`);
    for (const [id, session2] of this.deviceSessions.entries()) {
      if (session2.deviceFingerprint === deviceFingerprint && session2.ipAddress === ipAddress) {
        if (activeOnly && !session2.isActive) {
          continue;
        }
        return session2;
      }
    }
    return null;
  }
  async validateDeviceAccess(userId, ipAddress, deviceFingerprint) {
    console.log(`[DEV] Validating device access for user ${userId} from ${ipAddress}`);
    return true;
  }
  async updateDeviceSessionAccess(sessionId) {
    console.log(`[DEV] Updating device session access: ${sessionId}`);
    const session2 = this.deviceSessions.get(sessionId);
    if (session2) {
      session2.lastAccessAt = /* @__PURE__ */ new Date();
    }
  }
  async deactivateDeviceSession(sessionId) {
    console.log(`[DEV] Deactivating device session: ${sessionId}`);
    const session2 = this.deviceSessions.get(sessionId);
    if (session2) {
      session2.isActive = false;
      session2.lastAccessAt = /* @__PURE__ */ new Date();
      return true;
    }
    return false;
  }
  async reactivateDeviceSession(sessionId) {
    console.log(`[DEV] Reactivating device session: ${sessionId}`);
    const session2 = this.deviceSessions.get(sessionId);
    if (session2) {
      session2.isActive = true;
      session2.lastAccessAt = /* @__PURE__ */ new Date();
      return true;
    }
    return false;
  }
  async createOTPVerification(email, tokenId, otpCode) {
    console.log(`[DEV] Creating OTP verification for ${email}: ${otpCode}`);
    const otpId = this.currentOtpId++;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
    const otp = {
      id: otpId,
      email,
      tokenId,
      otpCode,
      attempts: 0,
      isVerified: false,
      expiresAt,
      verifiedAt: null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.otpVerifications.set(otpId, otp);
    return otp;
  }
  async getOTPVerification(email, tokenId) {
    console.log(`[DEV] Getting OTP verification for ${email}, token ${tokenId}`);
    for (const [id, otp] of this.otpVerifications.entries()) {
      if (otp.email === email && otp.tokenId === tokenId && !otp.isVerified) {
        return otp;
      }
    }
    return null;
  }
  async verifyOTP(email, tokenId, otpCode) {
    console.log(`[DEV] Verifying OTP for ${email}: ${otpCode}`);
    const otp = await this.getOTPVerification(email, tokenId);
    if (!otp) {
      return { success: false, attempts: 0 };
    }
    if (/* @__PURE__ */ new Date() > otp.expiresAt) {
      return { success: false, attempts: otp.attempts };
    }
    if (otp.attempts >= 3) {
      return { success: false, attempts: otp.attempts };
    }
    const newAttempts = await this.incrementOTPAttempts(otp.id);
    if (otp.otpCode === otpCode) {
      otp.isVerified = true;
      otp.verifiedAt = /* @__PURE__ */ new Date();
      return { success: true, attempts: newAttempts };
    }
    return { success: false, attempts: newAttempts };
  }
  async incrementOTPAttempts(otpId) {
    console.log(`[DEV] Incrementing OTP attempts: ${otpId}`);
    const otp = this.otpVerifications.get(otpId);
    if (otp) {
      otp.attempts++;
      return otp.attempts;
    }
    return 0;
  }
  async cleanupExpiredOTPs() {
    console.log("[DEV] Cleaning up expired OTPs");
    const now = /* @__PURE__ */ new Date();
    for (const [id, otp] of this.otpVerifications.entries()) {
      if (otp.expiresAt < now) {
        this.otpVerifications.delete(id);
      }
    }
  }
  async testConnection() {
    return true;
  }
};
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByWhatsApp(whatsappNumber) {
    const [user] = await db.select().from(users).where(eq(users.whatsappNumber, whatsappNumber));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    await this.logUserData(user);
    return user;
  }
  async logUserData(user) {
    try {
      const fs3 = await import("fs");
      const path4 = await import("path");
      const userData = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        name: user.name,
        whatsappNumber: user.whatsappNumber,
        id: user.id
      };
      const logEntry = JSON.stringify(userData) + "\n";
      const logPath = path4.join(process.cwd(), "user_data_log.txt");
      fs3.appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error("Error logging user data:", error);
    }
  }
  async getProducts() {
    return await db.select().from(products);
  }
  async getProduct(id) {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || void 0;
  }
  async getProductByCode(code) {
    const [product] = await db.select().from(products).where(eq(products.code, code));
    return product || void 0;
  }
  async createProduct(insertProduct) {
    const [product] = await db.insert(products).values({
      ...insertProduct,
      imageUrl: insertProduct.imageUrl || null
    }).returning();
    return product;
  }
  async updateProduct(id, updateData) {
    const [product] = await db.update(products).set({
      ...updateData,
      imageUrl: updateData.imageUrl || null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(products.id, id)).returning();
    return product || void 0;
  }
  async deleteProduct(id) {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount > 0;
  }
  async searchProducts(query, limit, offset) {
    const lowercaseQuery = `%${query.toLowerCase()}%`;
    let searchQuery = db.select().from(products).where(
      or(
        sql`LOWER(${products.name}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.code}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.category}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.finish}) LIKE ${lowercaseQuery}`
      )
    );
    if (limit !== void 0) {
      searchQuery = searchQuery.limit(limit);
    }
    if (offset !== void 0) {
      searchQuery = searchQuery.offset(offset);
    }
    return await searchQuery;
  }
  async getSearchCount(query) {
    const lowercaseQuery = `%${query.toLowerCase()}%`;
    const result = await db.select({ count: sql`count(*)` }).from(products).where(
      or(
        sql`LOWER(${products.name}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.code}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.category}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.finish}) LIKE ${lowercaseQuery}`
      )
    );
    return result[0]?.count || 0;
  }
  async filterProducts(filters) {
    let query = db.select().from(products);
    const conditions = [];
    if (filters.category) {
      conditions.push(eq(products.category, filters.category));
    }
    if (filters.finish) {
      conditions.push(eq(products.finish, filters.finish));
    }
    if (filters.material) {
      conditions.push(eq(products.material, filters.material));
    }
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    switch (filters.sortBy) {
      case "code":
        query = query.orderBy(asc(products.code));
        break;
      case "category":
        query = query.orderBy(asc(products.category));
        break;
      case "newest":
        query = query.orderBy(desc(products.createdAt));
        break;
      default:
        query = query.orderBy(asc(products.name));
    }
    if (filters.limit !== void 0) {
      query = query.limit(filters.limit);
    }
    if (filters.offset !== void 0) {
      query = query.offset(filters.offset);
    }
    return await query;
  }
  async getFilterCount(filters) {
    let query = db.select({ count: sql`count(*)` }).from(products);
    const conditions = [];
    if (filters.category) {
      conditions.push(eq(products.category, filters.category));
    }
    if (filters.finish) {
      conditions.push(eq(products.finish, filters.finish));
    }
    if (filters.material) {
      conditions.push(eq(products.material, filters.material));
    }
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    const result = await query;
    return result[0]?.count || 0;
  }
  async bulkCreateProducts(insertProducts) {
    const formattedProducts = insertProducts.map((p) => ({
      ...p,
      imageUrl: p.imageUrl || null
    }));
    const createdProducts = await db.insert(products).values(formattedProducts).returning();
    return createdProducts;
  }
  async getWishlistByUser(userId) {
    const wishlistWithProducts = await db.select({
      id: wishlists.id,
      userId: wishlists.userId,
      productId: wishlists.productId,
      createdAt: wishlists.createdAt,
      product: products
    }).from(wishlists).innerJoin(products, eq(wishlists.productId, products.id)).where(eq(wishlists.userId, userId));
    return wishlistWithProducts;
  }
  async addToWishlist(insertWishlist) {
    const [wishlist] = await db.insert(wishlists).values(insertWishlist).returning();
    return wishlist;
  }
  async removeFromWishlist(userId, productId) {
    const result = await db.delete(wishlists).where(eq(wishlists.userId, userId) && eq(wishlists.productId, productId));
    return result.rowCount > 0;
  }
  async isInWishlist(userId, productId) {
    const [wishlistItem] = await db.select().from(wishlists).where(eq(wishlists.userId, userId) && eq(wishlists.productId, productId));
    return !!wishlistItem;
  }
  // New methods for categories and finishes
  async getCategories() {
    const result = await db.selectDistinct({ category: products.category }).from(products);
    return result.map((r) => r.category).filter(Boolean);
  }
  async getFinishes() {
    const result = await db.selectDistinct({ finish: products.finish }).from(products);
    return result.map((r) => r.finish).filter(Boolean);
  }
  async getMaterials() {
    const result = await db.selectDistinct({ material: products.material }).from(products);
    return result.map((r) => r.material).filter(Boolean);
  }
  // Add new method to get all users
  async getAllUsers() {
    return await db.select().from(users);
  }
  async updateUserPassword(id, password) {
    const result = await db.update(users).set({ password }).where(eq(users.id, id));
    return result.rowCount > 0;
  }
  async updateUser(id, data) {
    if (data.isPrimaryAdmin !== void 0 || data.isAdmin !== void 0) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) return void 0;
      if (data.isPrimaryAdmin !== void 0 && !user.isPrimaryAdmin) {
        data.isPrimaryAdmin = false;
      }
    }
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }
  async deleteUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user || user.isPrimaryAdmin) return false;
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }
  // Dynamic filter methods that return only available options based on current selections
  async getAvailableCategories(filters) {
    let query = db.selectDistinct({ category: products.category }).from(products);
    const conditions = [];
    if (filters.finish) {
      conditions.push(eq(products.finish, filters.finish));
    }
    if (filters.material) {
      conditions.push(eq(products.material, filters.material));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const result = await query;
    return result.map((r) => r.category).filter(Boolean).sort();
  }
  async getAvailableFinishes(filters) {
    let query = db.selectDistinct({ finish: products.finish }).from(products);
    const conditions = [];
    if (filters.category) {
      conditions.push(eq(products.category, filters.category));
    }
    if (filters.material) {
      conditions.push(eq(products.material, filters.material));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const result = await query;
    return result.map((r) => r.finish).filter(Boolean).sort();
  }
  async getAvailableMaterials(filters) {
    let query = db.selectDistinct({ material: products.material }).from(products);
    const conditions = [];
    if (filters.category) {
      conditions.push(eq(products.category, filters.category));
    }
    if (filters.finish) {
      conditions.push(eq(products.finish, filters.finish));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const result = await query;
    return result.map((r) => r.material).filter(Boolean).sort();
  }
  // Access token operations
  async createAccessToken(email, userId) {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const [accessToken] = await db.insert(accessTokens).values({
      token,
      userId,
      email,
      expiresAt: null,
      // Never expires
      isUsed: false
    }).returning();
    return { token, tokenId: accessToken.id };
  }
  async getAccessToken(token) {
    const [accessToken] = await db.select().from(accessTokens).where(eq(accessTokens.token, token));
    return accessToken;
  }
  async getAccessTokenById(tokenId) {
    const [accessToken] = await db.select().from(accessTokens).where(eq(accessTokens.id, tokenId));
    return accessToken;
  }
  async getAllAccessTokens() {
    const tokens = await db.select({
      id: accessTokens.id,
      token: accessTokens.token,
      email: accessTokens.email,
      userId: accessTokens.userId,
      isUsed: accessTokens.isUsed,
      ipAddress: accessTokens.ipAddress,
      createdAt: accessTokens.createdAt,
      usedAt: accessTokens.usedAt,
      userName: users.name,
      userWhatsapp: users.whatsappNumber,
      userCity: users.city,
      profileCompleted: users.profileCompleted
    }).from(accessTokens).leftJoin(users, eq(accessTokens.userId, users.id)).orderBy(desc(accessTokens.createdAt));
    return tokens;
  }
  async linkTokenToUser(tokenId, userId) {
    const result = await db.update(accessTokens).set({ userId }).where(eq(accessTokens.id, tokenId));
    return result.rowCount > 0;
  }
  async markTokenAsUsed(tokenId, ipAddress, deviceFingerprint) {
    const result = await db.update(accessTokens).set({
      isUsed: true,
      usedAt: /* @__PURE__ */ new Date(),
      ipAddress,
      deviceFingerprint
    }).where(eq(accessTokens.id, tokenId));
    return result.rowCount > 0;
  }
  async cleanupExpiredTokens() {
  }
  // Device session operations
  async createDeviceSession(userId, tokenId, ipAddress, deviceFingerprint, userAgent) {
    const [session2] = await db.insert(deviceSessions).values({
      userId,
      tokenId,
      ipAddress,
      deviceFingerprint,
      userAgent,
      isActive: true
    }).returning();
    return session2;
  }
  async getDeviceSession(userId, tokenId) {
    const [session2] = await db.select().from(deviceSessions).where(and(
      eq(deviceSessions.userId, userId),
      eq(deviceSessions.tokenId, tokenId),
      eq(deviceSessions.isActive, true)
    ));
    return session2;
  }
  async getDeviceSessionByFingerprint(deviceFingerprint, ipAddress, activeOnly = false) {
    let query = db.select().from(deviceSessions).where(and(
      eq(deviceSessions.deviceFingerprint, deviceFingerprint),
      eq(deviceSessions.ipAddress, ipAddress)
    ));
    if (activeOnly) {
      query = query.where(eq(deviceSessions.isActive, true));
    }
    const [session2] = await query;
    return session2;
  }
  async validateDeviceAccess(userId, ipAddress, deviceFingerprint) {
    const [session2] = await db.select().from(deviceSessions).where(and(
      eq(deviceSessions.userId, userId),
      eq(deviceSessions.ipAddress, ipAddress),
      eq(deviceSessions.deviceFingerprint, deviceFingerprint),
      eq(deviceSessions.isActive, true)
    ));
    return !!session2;
  }
  async updateDeviceSessionAccess(sessionId) {
    await db.update(deviceSessions).set({ lastAccessAt: /* @__PURE__ */ new Date() }).where(eq(deviceSessions.id, sessionId));
  }
  async deactivateDeviceSession(sessionId) {
    const result = await db.update(deviceSessions).set({
      isActive: false,
      lastAccessAt: /* @__PURE__ */ new Date()
    }).where(eq(deviceSessions.id, sessionId));
    return result.rowCount > 0;
  }
  async reactivateDeviceSession(sessionId) {
    const result = await db.update(deviceSessions).set({
      isActive: true,
      lastAccessAt: /* @__PURE__ */ new Date()
    }).where(eq(deviceSessions.id, sessionId));
    return result.rowCount > 0;
  }
  // OTP verification operations
  async createOTPVerification(email, tokenId, otpCode) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
    const [otp] = await db.insert(otpVerifications).values({
      email,
      tokenId,
      otpCode,
      expiresAt,
      attempts: 0,
      isVerified: false
    }).returning();
    return otp;
  }
  async getOTPVerification(email, tokenId) {
    const [otp] = await db.select().from(otpVerifications).where(and(
      eq(otpVerifications.email, email),
      eq(otpVerifications.tokenId, tokenId),
      eq(otpVerifications.isVerified, false)
    )).orderBy(desc(otpVerifications.createdAt)).limit(1);
    return otp;
  }
  async verifyOTP(email, tokenId, otpCode) {
    const otp = await this.getOTPVerification(email, tokenId);
    if (!otp) {
      return { success: false, attempts: 0 };
    }
    if (/* @__PURE__ */ new Date() > new Date(otp.expiresAt)) {
      return { success: false, attempts: otp.attempts };
    }
    if (otp.attempts >= 3) {
      return { success: false, attempts: otp.attempts };
    }
    const newAttempts = await this.incrementOTPAttempts(otp.id);
    if (otp.otpCode === otpCode) {
      await db.update(otpVerifications).set({
        isVerified: true,
        verifiedAt: /* @__PURE__ */ new Date()
      }).where(eq(otpVerifications.id, otp.id));
      return { success: true, attempts: newAttempts };
    }
    return { success: false, attempts: newAttempts };
  }
  async incrementOTPAttempts(otpId) {
    const [updated] = await db.update(otpVerifications).set({
      attempts: sql`${otpVerifications.attempts} + 1`
    }).where(eq(otpVerifications.id, otpId)).returning({ attempts: otpVerifications.attempts });
    return updated?.attempts || 0;
  }
  async cleanupExpiredOTPs() {
    await db.delete(otpVerifications).where(lt(otpVerifications.expiresAt, /* @__PURE__ */ new Date()));
  }
  async testConnection() {
    try {
      await db.select().from(users).limit(1);
      return true;
    } catch (error) {
      console.error("Database connection test failed:", error);
      return false;
    }
  }
};
var isDev2 = process.env.NODE_ENV === "development";
var storage = isDev2 ? new MemStorage() : new DatabaseStorage();

// server/routes.ts
import multer from "multer";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcrypt";
import csvParser from "csv-parser";

// server/migrate.ts
var migrations = [
  {
    filename: "001_initial_schema.sql",
    sql: `-- Initial database schema for VMake Catalog
-- This creates the base tables for users, products, and wishlists

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "whatsapp_number" TEXT NOT NULL UNIQUE,
  "password" TEXT,
  "is_admin" BOOLEAN DEFAULT FALSE,
  "is_primary_admin" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS "products" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "category" TEXT NOT NULL,
  "length" REAL NOT NULL DEFAULT 0,
  "breadth" REAL NOT NULL DEFAULT 0,
  "height" REAL NOT NULL DEFAULT 0,
  "finish" TEXT NOT NULL,
  "material" TEXT DEFAULT '' NOT NULL,
  "image_url" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Wishlists table
CREATE TABLE IF NOT EXISTS "wishlists" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "wishlists_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);

-- User sessions table for express-session
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" VARCHAR NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_users_whatsapp" ON "users"("whatsapp_number");
CREATE INDEX IF NOT EXISTS "idx_products_code" ON "products"("code");
CREATE INDEX IF NOT EXISTS "idx_products_category" ON "products"("category");
CREATE INDEX IF NOT EXISTS "idx_products_finish" ON "products"("finish");
CREATE INDEX IF NOT EXISTS "idx_products_material" ON "products"("material");
CREATE INDEX IF NOT EXISTS "idx_wishlists_user_id" ON "wishlists"("user_id");
CREATE INDEX IF NOT EXISTS "idx_wishlists_product_id" ON "wishlists"("product_id");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_expire" ON "user_sessions"("expire");`
  },
  {
    filename: "002_add_product_images_and_feedback.sql",
    sql: `-- Add multiple images and description to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_urls TEXT[],
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  product_id INTEGER,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_product_id ON feedback(product_id);
CREATE INDEX IF NOT EXISTS idx_feedback_is_approved ON feedback(is_approved);
CREATE INDEX IF NOT EXISTS idx_feedback_is_published ON feedback(is_published);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);`
  },
  {
    filename: "003_update_dimensions_to_decimal.sql",
    sql: `-- Migration to change product dimensions from integer to real (decimal)
-- This allows storing decimal values like 91.5 instead of truncating to 91

-- Update the column types to support decimal values
ALTER TABLE products
  ALTER COLUMN length TYPE REAL,
  ALTER COLUMN breadth TYPE REAL,
  ALTER COLUMN height TYPE REAL;

-- Add a comment to document the change
COMMENT ON COLUMN products.length IS 'Product length in cm (supports decimal values)';
COMMENT ON COLUMN products.breadth IS 'Product breadth in cm (supports decimal values)';
COMMENT ON COLUMN products.height IS 'Product height in cm (supports decimal values)';`
  },
  {
    filename: "004_add_security_tables.sql",
    sql: `-- Add security tables for token-based access and OTP verification
-- This migration adds support for one-time tokens, device binding, and OTP verification

-- Add email field to users table if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" TEXT;

-- Access tokens for one-time links
CREATE TABLE IF NOT EXISTS "access_tokens" (
  "id" SERIAL PRIMARY KEY,
  "token" TEXT NOT NULL UNIQUE,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "is_used" BOOLEAN DEFAULT FALSE,
  "ip_address" TEXT,
  "device_fingerprint" TEXT,
  "expires_at" TIMESTAMP NOT NULL,
  "used_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Device sessions for IP/device binding
CREATE TABLE IF NOT EXISTS "device_sessions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_id" INTEGER REFERENCES "access_tokens"("id") ON DELETE CASCADE,
  "ip_address" TEXT NOT NULL,
  "device_fingerprint" TEXT NOT NULL,
  "user_agent" TEXT,
  "is_active" BOOLEAN DEFAULT TRUE,
  "last_access_at" TIMESTAMP DEFAULT NOW(),
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- OTP verifications
CREATE TABLE IF NOT EXISTS "otp_verifications" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "token_id" INTEGER REFERENCES "access_tokens"("id") ON DELETE CASCADE,
  "otp_code" TEXT NOT NULL,
  "attempts" INTEGER DEFAULT 0,
  "is_verified" BOOLEAN DEFAULT FALSE,
  "expires_at" TIMESTAMP NOT NULL,
  "verified_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_access_tokens_token" ON "access_tokens"("token");
CREATE INDEX IF NOT EXISTS "idx_access_tokens_email" ON "access_tokens"("email");
CREATE INDEX IF NOT EXISTS "idx_access_tokens_user_id" ON "access_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "idx_access_tokens_expires_at" ON "access_tokens"("expires_at");

CREATE INDEX IF NOT EXISTS "idx_device_sessions_user_id" ON "device_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_device_sessions_token_id" ON "device_sessions"("token_id");
CREATE INDEX IF NOT EXISTS "idx_device_sessions_ip_address" ON "device_sessions"("ip_address");
CREATE INDEX IF NOT EXISTS "idx_device_sessions_device_fingerprint" ON "device_sessions"("device_fingerprint");

CREATE INDEX IF NOT EXISTS "idx_otp_verifications_email" ON "otp_verifications"("email");
CREATE INDEX IF NOT EXISTS "idx_otp_verifications_token_id" ON "otp_verifications"("token_id");
CREATE INDEX IF NOT EXISTS "idx_otp_verifications_otp_code" ON "otp_verifications"("otp_code");
CREATE INDEX IF NOT EXISTS "idx_otp_verifications_expires_at" ON "otp_verifications"("expires_at");`
  },
  {
    filename: "005_add_city_to_users.sql",
    sql: `-- Add city field to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT;`
  },
  {
    filename: "006_add_profile_completed.sql",
    sql: `-- Add profile_completed field to users table
-- This migration adds support for tracking whether a user has completed their profile

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_completed" BOOLEAN DEFAULT FALSE;

-- Update existing users to mark profile as completed if they have name, whatsapp, and city
UPDATE "users"
SET "profile_completed" = TRUE
WHERE "name" IS NOT NULL
  AND "whatsapp_number" IS NOT NULL
  AND "city" IS NOT NULL
  AND LENGTH(TRIM("name")) > 0
  AND LENGTH(TRIM("whatsapp_number")) > 0
  AND LENGTH(TRIM("city")) > 0;`
  }
];
async function runMigrations() {
  if (!pool) {
    console.log("No database pool available, skipping migrations");
    return;
  }
  try {
    console.log("Starting database migrations...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const executedResult = await pool.query("SELECT filename FROM migrations ORDER BY id");
    const executedMigrations = new Set(executedResult.rows.map((row) => row.filename));
    console.log(`Found ${migrations.length} embedded migrations`);
    for (const migration of migrations) {
      if (executedMigrations.has(migration.filename)) {
        console.log(`Migration ${migration.filename} already executed, skipping`);
        continue;
      }
      console.log(`Executing migration: ${migration.filename}`);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO migrations (filename) VALUES ($1)",
          [migration.filename]
        );
        await client.query("COMMIT");
        console.log(`Migration ${migration.filename} executed successfully`);
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`Migration ${migration.filename} failed:`, error);
        throw error;
      } finally {
        client.release();
      }
    }
    console.log("Database migrations completed successfully");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}
async function initializeDatabase() {
  if (!pool) {
    console.log("No database pool available, skipping database initialization");
    return;
  }
  try {
    console.log("Initializing database...");
    await runMigrations();
    const adminCheck = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE is_primary_admin = true"
    );
    if (parseInt(adminCheck.rows[0].count) === 0) {
      console.log("Creating primary admin user...");
      const adminWhatsApp = process.env.ADMIN_WHATSAPP || "+918882636296";
      await pool.query(`
        INSERT INTO users (name, whatsapp_number, password, is_admin, is_primary_admin)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (whatsapp_number) DO UPDATE SET
          is_admin = true,
          is_primary_admin = true
      `, ["Admin User", adminWhatsApp, null, true, true]);
      console.log(`Primary admin created with WhatsApp: ${adminWhatsApp}`);
    } else {
      console.log("Primary admin already exists");
    }
    console.log("Database initialization completed");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

// server/email.ts
import nodemailer from "nodemailer";
import dotenv2 from "dotenv";
dotenv2.config();
var EmailService = class {
  transporter;
  isConfigured = false;
  constructor() {
    this.setupTransporter();
  }
  setupTransporter() {
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    if (!emailHost || !emailUser || !emailPass) {
      console.warn("Email service not configured. OTP emails will be logged to console.");
      this.isConfigured = false;
      return;
    }
    const config = {
      host: emailHost,
      port: parseInt(emailPort || "587"),
      secure: emailPort === "465",
      // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPass
      }
    };
    this.transporter = nodemailer.createTransporter(config);
    this.isConfigured = true;
    this.transporter.verify((error, success) => {
      if (error) {
        console.error("Email service configuration error:", error);
        this.isConfigured = false;
      } else {
        console.log("Email service is ready to send messages");
      }
    });
  }
  async sendOTP(email, otpCode, tokenId) {
    const subject = "VMake Catalog - Access Verification Code";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #D4AF37; margin: 0;">VMake Finessee</h1>
          <p style="color: #666; margin: 5px 0;">Product Catalog Access</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center;">
          <h2 style="color: #333; margin-bottom: 20px;">Your Verification Code</h2>
          <div style="background: #fff; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #D4AF37; letter-spacing: 4px;">${otpCode}</span>
          </div>
          <p style="color: #666; margin: 15px 0;">
            Enter this code to access your personalized product catalog.
          </p>
          <p style="color: #999; font-size: 14px; margin-top: 20px;">
            This code will expire in 10 minutes and can only be used once.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      </div>
    `;
    if (!this.isConfigured) {
      console.log(`
=== EMAIL OTP (Development Mode) ===
To: ${email}
Subject: ${subject}
OTP Code: ${otpCode}
Token ID: ${tokenId}
===================================
      `);
      return true;
    }
    try {
      const info = await this.transporter.sendMail({
        from: `"VMake Finessee" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html
      });
      console.log("OTP email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      return false;
    }
  }
  async sendTokenLink(email, tokenLink) {
    const subject = "VMake Catalog - Your Personal Access Link";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #D4AF37; margin: 0;">VMake Finessee</h1>
          <p style="color: #666; margin: 5px 0;">Product Catalog Access</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Your Personal Catalog Access</h2>
          <p style="color: #666; margin-bottom: 25px;">
            Click the button below to access your personalized VMake product catalog:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${tokenLink}" 
               style="background: #D4AF37; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Access Catalog
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 25px;">
            <strong>Important:</strong> This link is unique to you and will be bound to your device for security.
            You may need to complete your profile before accessing the catalog.
          </p>
          
          <p style="color: #999; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="word-break: break-all;">${tokenLink}</span>
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">
            If you didn't request this access, please ignore this email.
          </p>
        </div>
      </div>
    `;
    if (!this.isConfigured) {
      console.log(`
=== TOKEN LINK EMAIL (Development Mode) ===
To: ${email}
Subject: ${subject}
Token Link: ${tokenLink}
==========================================
      `);
      return true;
    }
    try {
      const info = await this.transporter.sendMail({
        from: `"VMake Finessee" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html
      });
      console.log("Token link email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("Failed to send token link email:", error);
      return false;
    }
  }
};
var emailService = new EmailService();

// server/security-utils.ts
import crypto from "crypto";
function createDeviceFingerprint(userAgent, ip, acceptLanguage) {
  const data = `${userAgent}|${ip}|${acceptLanguage || ""}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}
function getClientIP(req) {
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.headers["x-real-ip"] || "127.0.0.1";
}
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
function sanitizeInput(input) {
  return input.replace(/[<>\"'%;()&+]/g, "");
}

// server/middleware.ts
function errorHandler(err, req, res, next) {
  console.error("Error:", err);
  let status = 500;
  let message = "Internal server error";
  let details = void 0;
  if (err.name === "ValidationError") {
    status = 400;
    message = "Validation error";
    details = err.message;
  } else if (err.name === "UnauthorizedError") {
    status = 401;
    message = "Unauthorized";
  } else if (err.name === "ForbiddenError") {
    status = 403;
    message = "Forbidden";
  } else if (err.name === "NotFoundError") {
    status = 404;
    message = "Not found";
  } else if (err.code === "LIMIT_FILE_SIZE") {
    status = 413;
    message = "File too large";
    details = "Maximum file size is 100MB";
  } else if (err.code === "ENOENT") {
    status = 404;
    message = "File not found";
  }
  if (process.env.NODE_ENV === "production" && status === 500) {
    message = "Something went wrong";
    details = void 0;
  }
  res.status(status).json({
    error: true,
    message,
    ...details && { details },
    ...process.env.NODE_ENV === "development" && { stack: err.stack }
  });
}
function notFoundHandler(req, res) {
  res.status(404).json({
    error: true,
    message: "Route not found",
    path: req.originalUrl
  });
}
async function requireAdmin(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({
      error: true,
      message: "Authentication required"
    });
  }
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({
        error: true,
        message: "User not found"
      });
    }
    if (!user.isAdmin) {
      return res.status(403).json({
        error: true,
        message: "Admin access required"
      });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({
      error: true,
      message: "Internal server error"
    });
  }
}
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    console.log(`${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`);
  });
  next();
}
async function requireTokenAuth(req, res, next) {
  try {
    let userId = req.session?.userId;
    let tokenId = req.session?.tokenId;
    if (!userId) {
      const clientIP2 = getClientIP(req);
      const userAgent2 = req.headers["user-agent"] || "";
      const deviceFingerprint2 = createDeviceFingerprint(userAgent2, clientIP2, req.headers["accept-language"]);
      console.log(`[AUTH] Trying device authentication for fingerprint ${deviceFingerprint2.substring(0, 8)}... from ${clientIP2}`);
      const deviceSession2 = await storage.getDeviceSessionByFingerprint(deviceFingerprint2, clientIP2, true);
      if (deviceSession2) {
        console.log(`[AUTH] Found active device session for user ${deviceSession2.userId}`);
      } else {
        console.log(`[AUTH] No active device session found for fingerprint ${deviceFingerprint2.substring(0, 8)}... from ${clientIP2}`);
      }
      if (deviceSession2) {
        userId = deviceSession2.userId;
        tokenId = deviceSession2.tokenId;
        if (req.session) {
          req.session.userId = userId;
          req.session.tokenId = tokenId;
        }
        await storage.updateDeviceSessionAccess(deviceSession2.id);
      }
    }
    if (!userId) {
      return res.status(401).json({
        error: true,
        message: "Authentication required",
        requiresToken: true
      });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({
        error: true,
        message: "User not found"
      });
    }
    if (user.isAdmin) {
      return next();
    }
    if (!tokenId) {
      return res.status(401).json({
        error: true,
        message: "Token-based access required",
        requiresToken: true
      });
    }
    const clientIP = getClientIP(req);
    const userAgent = req.headers["user-agent"] || "";
    const deviceFingerprint = createDeviceFingerprint(userAgent, clientIP, req.headers["accept-language"]);
    const isValidDevice = await storage.validateDeviceAccess(userId, clientIP, deviceFingerprint);
    if (!isValidDevice) {
      return res.status(403).json({
        error: true,
        message: "Access denied. This session is bound to a different device or location."
      });
    }
    const deviceSession = await storage.getDeviceSession(userId, tokenId);
    if (deviceSession) {
      await storage.updateDeviceSessionAccess(deviceSession.id);
    }
    next();
  } catch (error) {
    console.error("Token auth middleware error:", error);
    res.status(500).json({
      error: true,
      message: "Authentication error"
    });
  }
}
async function cleanupExpiredData(req, res, next) {
  try {
    if (Math.random() < 0.01) {
      await storage.cleanupExpiredTokens();
      await storage.cleanupExpiredOTPs();
    }
    next();
  } catch (error) {
    console.error("Cleanup middleware error:", error);
    next();
  }
}
var tokenGenerationAttempts = /* @__PURE__ */ new Map();
function rateLimitTokenGeneration(req, res, next) {
  const clientIP = getClientIP(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1e3;
  const maxAttempts = 5;
  const attempts = tokenGenerationAttempts.get(clientIP);
  if (attempts) {
    if (now - attempts.lastAttempt > windowMs) {
      tokenGenerationAttempts.set(clientIP, { count: 1, lastAttempt: now });
    } else if (attempts.count >= maxAttempts) {
      return res.status(429).json({
        error: true,
        message: "Too many token generation attempts. Please try again later.",
        retryAfter: Math.ceil((windowMs - (now - attempts.lastAttempt)) / 1e3)
      });
    } else {
      attempts.count++;
      attempts.lastAttempt = now;
    }
  } else {
    tokenGenerationAttempts.set(clientIP, { count: 1, lastAttempt: now });
  }
  next();
}

// server/routes.ts
var upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024
    // 100MB in bytes
  }
});
var uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}
async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}
async function registerRoutes(app2) {
  app2.get("/api/health", async (_req, res) => {
    try {
      const result = await storage.testConnection();
      res.json({
        status: "healthy",
        database: result ? "connected" : "disconnected",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        database: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app2.get("/api/init-db", async (_req, res) => {
    try {
      console.log("Database initialization requested via GET");
      await initializeDatabase();
      res.json({ message: "Database initialized successfully" });
    } catch (error) {
      console.error("Database initialization error:", error);
      res.status(500).json({ error: "Failed to initialize database" });
    }
  });
  app2.post("/api/init-db", async (req, res) => {
    try {
      console.log("Database initialization requested");
      const { initKey } = req.body;
      const validKeys = [process.env.SESSION_SECRET, "default-init-key"];
      if (!validKeys.includes(initKey)) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      await initializeDatabase();
      res.json({ message: "Database initialized successfully" });
    } catch (error) {
      console.error("Database initialization error:", error);
      res.status(500).json({ error: "Failed to initialize database" });
    }
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { name, whatsappNumber } = insertUserSchema.parse(req.body);
      let user;
      try {
        user = await storage.getUserByWhatsApp(whatsappNumber);
        if (!user) {
          user = await storage.createUser({ name, whatsappNumber });
        }
      } catch (storageError) {
        console.error("Storage error:", storageError);
        return res.status(500).json({
          message: "Registration failed. Please try again."
        });
      }
      if (req.session) {
        req.session.userId = user.id;
      }
      res.json({ user, success: true });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({
        message: error.message.includes("require") ? "Registration failed. Please try again." : error.message
      });
    }
  });
  app2.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/finishes", async (_req, res) => {
    try {
      const finishes = await storage.getFinishes();
      res.json(finishes);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/materials", async (_req, res) => {
    try {
      const materials = await storage.getMaterials();
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/filters/categories", async (req, res) => {
    try {
      const { finish, material } = req.query;
      const categories = await storage.getAvailableCategories({
        finish: finish === "all" ? void 0 : finish,
        material: material === "all" ? void 0 : material
      });
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/filters/finishes", async (req, res) => {
    try {
      const { category, material } = req.query;
      const finishes = await storage.getAvailableFinishes({
        category: category === "all" ? void 0 : category,
        material: material === "all" ? void 0 : material
      });
      res.json(finishes);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/filters/materials", async (req, res) => {
    try {
      const { category, finish } = req.query;
      const materials = await storage.getAvailableMaterials({
        category: category === "all" ? void 0 : category,
        finish: finish === "all" ? void 0 : finish
      });
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/wishlist", requireTokenAuth, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const wishlist = await storage.getWishlistByUser(userId);
      res.json(wishlist);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/wishlist", requireTokenAuth, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const { productId } = insertWishlistSchema.parse({ ...req.body, userId });
      const isInWishlist = await storage.isInWishlist(userId, productId);
      if (isInWishlist) {
        return res.status(400).json({ message: "Product already in wishlist" });
      }
      const wishlist = await storage.addToWishlist({ userId, productId });
      res.json(wishlist);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/wishlist/:productId", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const productId = parseInt(req.params.productId);
      const success = await storage.removeFromWishlist(userId, productId);
      if (!success) {
        return res.status(404).json({ message: "Item not found in wishlist" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/auth/admin-login", async (req, res) => {
    try {
      console.log("Admin login attempt:", {
        whatsappNumber: req.body.whatsappNumber,
        hasPassword: !!req.body.password
      });
      const { whatsappNumber, password } = adminLoginSchema.parse(req.body);
      const user = await storage.getUserByWhatsApp(whatsappNumber);
      console.log("User found:", user ? {
        id: user.id,
        isAdmin: user.isAdmin,
        hasPassword: !!user.password
      } : "No user found");
      if (!user || !user.isAdmin) {
        return res.status(401).json({ message: "Invalid admin credentials" });
      }
      if (!user.password) {
        console.log("Setting password for admin without password");
        const hashedPassword = await hashPassword(password);
        await storage.updateUserPassword(user.id, hashedPassword);
      } else {
        const isPasswordValid = await verifyPassword(password, user.password);
        console.log("Password verification result:", isPasswordValid);
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid admin credentials" });
        }
      }
      if (req.session) {
        req.session.userId = user.id;
        console.log("Session set with userId:", user.id);
      } else {
        console.error("No session object available");
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, success: true });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(400).json({ message: error.message });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const clientIP = getClientIP(req);
      const userAgent = req.headers["user-agent"] || "";
      const deviceFingerprint = createDeviceFingerprint(userAgent, clientIP, req.headers["accept-language"]);
      let boundUser = null;
      try {
        const deviceSession = await storage.getDeviceSessionByFingerprint(deviceFingerprint, clientIP, false);
        if (deviceSession && deviceSession.userId) {
          boundUser = await storage.getUser(deviceSession.userId);
          console.log(`[LOGOUT] Found bound user ${boundUser?.name} (${boundUser?.id}) for IP ${clientIP}`);
          if (deviceSession.id) {
            try {
              const deactivated = await storage.deactivateDeviceSession(deviceSession.id);
              console.log(`[LOGOUT] Device session ${deviceSession.id} deactivated: ${deactivated}`);
            } catch (sessionError) {
              console.error("[LOGOUT] Error deactivating device session:", sessionError);
            }
          }
        }
      } catch (deviceError) {
        console.error("[LOGOUT] Error handling device session:", deviceError);
      }
      const responseData = {
        success: true,
        boundUser: boundUser ? {
          id: boundUser.id,
          name: boundUser.name,
          email: boundUser.email || boundUser.whatsappNumber
        } : null
      };
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
      });
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("[LOGOUT] Error destroying session:", err);
            return res.status(500).json({ message: "Could not log out" });
          } else {
            console.log(`[LOGOUT] Session destroyed successfully for user ${userId}`);
            return res.json(responseData);
          }
        });
      } else {
        console.log(`[LOGOUT] No session to destroy`);
        return res.json(responseData);
      }
    } catch (error) {
      console.error("[LOGOUT] Error during logout:", error);
      try {
        res.clearCookie("connect.sid", {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax"
        });
        if (req.session) {
          req.session.destroy(() => {
            return res.status(500).json({ message: "An error occurred during logout, but session was cleared" });
          });
        } else {
          return res.status(500).json({ message: "An error occurred during logout" });
        }
      } catch (finalError) {
        return res.status(500).json({ message: "An error occurred during logout" });
      }
    }
  });
  app2.post("/api/auth/login-bound-user", async (req, res) => {
    try {
      const clientIP = getClientIP(req);
      const userAgent = req.headers["user-agent"] || "";
      const deviceFingerprint = createDeviceFingerprint(userAgent, clientIP, req.headers["accept-language"]);
      console.log(`[LOGIN-BOUND] Attempting to find device session for fingerprint ${deviceFingerprint.substring(0, 8)}... from ${clientIP}`);
      const deviceSession = await storage.getDeviceSessionByFingerprint(deviceFingerprint, clientIP, false);
      if (!deviceSession) {
        console.log(`[LOGIN-BOUND] No device session found for fingerprint ${deviceFingerprint.substring(0, 8)}... from ${clientIP}`);
        return res.status(401).json({ message: "No bound user found for this device" });
      }
      if (!deviceSession.userId) {
        console.log(`[LOGIN-BOUND] Device session found but has no userId for fingerprint ${deviceFingerprint.substring(0, 8)}... from ${clientIP}`);
        return res.status(401).json({ message: "No bound user found for this device" });
      }
      const boundUser = await storage.getUser(deviceSession.userId);
      if (!boundUser) {
        return res.status(404).json({ message: "User not found" });
      }
      console.log(`[LOGIN] Logging in bound user ${boundUser.name} (${boundUser.id}) for IP ${clientIP}`);
      try {
        if (deviceSession.id) {
          if (!deviceSession.isActive) {
            const reactivated = await storage.reactivateDeviceSession(deviceSession.id);
            console.log(`[LOGIN] Device session ${deviceSession.id} reactivated: ${reactivated}`);
          } else {
            await storage.updateDeviceSessionAccess(deviceSession.id);
            console.log(`[LOGIN] Device session ${deviceSession.id} access time updated`);
          }
        } else {
          console.log(`[LOGIN] Device session has no ID, cannot reactivate`);
        }
      } catch (error) {
        console.error(`[LOGIN] Error reactivating device session:`, error);
      }
      if (req.session) {
        req.session.userId = boundUser.id;
        req.session.tokenId = deviceSession.tokenId;
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session:", err);
            return res.status(500).json({ message: "Could not establish session" });
          }
          return res.json({
            success: true,
            user: {
              id: boundUser.id,
              name: boundUser.name,
              email: boundUser.email || boundUser.whatsappNumber,
              isAdmin: boundUser.isAdmin
            }
          });
        });
      } else {
        return res.status(500).json({ message: "Could not establish session" });
      }
    } catch (error) {
      console.error("Login bound user error:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });
  app2.post("/api/auth/clear-session", async (req, res) => {
    if (process.env.NODE_ENV !== "development") {
      return res.status(404).json({ message: "Not found" });
    }
    console.log(`[TEST] Clearing session for testing purposes`);
    if (req.session) {
      req.session.userId = void 0;
      req.session.tokenId = void 0;
    }
    res.json({ success: true, message: "Session cleared for testing" });
  });
  app2.get("/api/auth/me", async (req, res) => {
    const userId = req.session?.userId;
    const tryDeviceAuthentication = async () => {
      const clientIP = getClientIP(req);
      const userAgent = req.headers["user-agent"] || "";
      const deviceFingerprint = createDeviceFingerprint(userAgent, clientIP, req.headers["accept-language"]);
      console.log(`[AUTH] Trying device authentication for fingerprint ${deviceFingerprint.substring(0, 8)}... from ${clientIP}`);
      const deviceSession = await storage.getDeviceSessionByFingerprint(deviceFingerprint, clientIP);
      if (deviceSession && deviceSession.isActive) {
        console.log(`[AUTH] Found active device session for user ${deviceSession.userId}`);
        if (req.session) {
          req.session.userId = deviceSession.userId;
          req.session.tokenId = deviceSession.tokenId;
        }
        const user2 = await storage.getUser(deviceSession.userId);
        if (user2) {
          console.log(`[AUTH] Successfully restored session for user ${user2.name} (${user2.id})`);
          await storage.updateDeviceSessionAccess(deviceSession.id);
          return user2;
        }
      } else {
        console.log(`[AUTH] No active device session found for fingerprint ${deviceFingerprint.substring(0, 8)}... from ${clientIP}`);
      }
      return null;
    };
    if (!userId) {
      const user2 = await tryDeviceAuthentication();
      if (user2) {
        return res.json({ user: user2 });
      }
      return res.status(401).json({ message: "Not authenticated" });
    }
    let user = await storage.getUser(userId);
    if (!user) {
      user = await tryDeviceAuthentication();
      if (user) {
        return res.json({ user });
      }
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ user });
  });
  app2.post("/api/auth/generate-token", rateLimitTokenGeneration, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ message: "Valid email is required" });
      }
      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
      let user = await storage.getUserByWhatsApp(sanitizedEmail);
      const { token, tokenId } = await storage.createAccessToken(sanitizedEmail, user?.id);
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      const tokenUrl = `${baseUrl}/access?token=${token}`;
      const emailSent = await emailService.sendTokenLink(sanitizedEmail, tokenUrl);
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send access link email" });
      }
      res.json({
        success: true,
        message: "Access link sent to your email",
        tokenId
        // For development/testing purposes
      });
    } catch (error) {
      console.error("Token generation error:", error);
      res.status(500).json({ message: "Failed to generate access token" });
    }
  });
  app2.get("/api/auth/access-tokens", requireAdmin, async (req, res) => {
    try {
      const tokens = await storage.getAllAccessTokens();
      res.json({ tokens });
    } catch (error) {
      console.error("Get access tokens error:", error);
      res.status(500).json({ message: "Failed to get access tokens" });
    }
  });
  app2.post("/api/auth/resend-token", requireAdmin, async (req, res) => {
    try {
      const { tokenId } = req.body;
      if (!tokenId) {
        return res.status(400).json({ message: "Token ID is required" });
      }
      const accessToken = await storage.getAccessTokenById(tokenId);
      if (!accessToken) {
        return res.status(404).json({ message: "Access token not found" });
      }
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      const tokenUrl = `${baseUrl}/access?token=${accessToken.token}`;
      const emailSent = await emailService.sendTokenLink(accessToken.email, tokenUrl);
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send access link email" });
      }
      res.json({
        success: true,
        message: "Access link resent successfully",
        tokenUrl
      });
    } catch (error) {
      console.error("Resend token error:", error);
      res.status(500).json({ message: "Failed to resend access token" });
    }
  });
  app2.get("/api/auth/validate-token", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      const accessToken = await storage.getAccessToken(token);
      if (!accessToken) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      if (accessToken.isUsed && accessToken.ipAddress) {
        const clientIP2 = getClientIP(req);
        if (accessToken.ipAddress !== clientIP2) {
          return res.status(403).json({
            message: "Access denied. This link can only be used from the original device and location."
          });
        }
      }
      const clientIP = getClientIP(req);
      const userAgent = req.headers["user-agent"] || "";
      const deviceFingerprint = createDeviceFingerprint(userAgent, clientIP, req.headers["accept-language"]);
      if (!accessToken.ipAddress) {
        await storage.markTokenAsUsed(accessToken.id, clientIP, deviceFingerprint);
        if (accessToken.userId) {
          await storage.createDeviceSession(
            accessToken.userId,
            accessToken.id,
            clientIP,
            deviceFingerprint,
            userAgent
          );
        }
        let user = null;
        let requiresProfileCompletion = true;
        if (accessToken.userId) {
          user = await storage.getUser(accessToken.userId);
          requiresProfileCompletion = !user || !user.profileCompleted;
        } else {
          user = await storage.getUserByEmail ? await storage.getUserByEmail(accessToken.email) : null;
          if (user) {
            await storage.linkTokenToUser(accessToken.id, user.id);
            requiresProfileCompletion = !user.profileCompleted;
          }
        }
        return res.json({
          success: true,
          requiresProfileCompletion,
          email: accessToken.email,
          tokenId: accessToken.id,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
          message: requiresProfileCompletion ? "Please complete your profile" : "Welcome back! Token validated successfully"
        });
      } else {
        if (accessToken.userId) {
          const deviceSession = await storage.getDeviceSession(accessToken.userId, accessToken.id);
          if (deviceSession) {
            await storage.updateDeviceSessionAccess(deviceSession.id);
          }
          const user = await storage.getUser(accessToken.userId);
          const requiresProfileCompletion = !user || !user.profileCompleted;
          if (!requiresProfileCompletion && user && req.session) {
            req.session.userId = user.id;
            req.session.tokenId = accessToken.id;
            return req.session.save((err) => {
              if (err) {
                console.error("Error saving session:", err);
              }
              return res.json({
                success: true,
                requiresProfileCompletion,
                email: accessToken.email,
                tokenId: accessToken.id,
                user: user ? { id: user.id, name: user.name, email: user.email } : null,
                message: requiresProfileCompletion ? "Please complete your profile" : "Welcome back! Token validated successfully"
              });
            });
          }
          return res.json({
            success: true,
            requiresProfileCompletion,
            email: accessToken.email,
            tokenId: accessToken.id,
            user: user ? { id: user.id, name: user.name, email: user.email } : null,
            message: requiresProfileCompletion ? "Please complete your profile" : "Welcome back! Token validated successfully"
          });
        }
        return res.json({
          success: true,
          requiresProfileCompletion: true,
          email: accessToken.email,
          tokenId: accessToken.id,
          user: null,
          message: "Please complete your profile"
        });
      }
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(500).json({ message: "Failed to validate token" });
    }
  });
  app2.post("/api/auth/update-user-info", async (req, res) => {
    try {
      const { name, whatsappNumber, city, email, tokenId } = req.body;
      if (!name || !whatsappNumber || !city || !email || !tokenId) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const sanitizedName = sanitizeInput(name.trim());
      const sanitizedWhatsapp = sanitizeInput(whatsappNumber.trim());
      const sanitizedCity = sanitizeInput(city.trim());
      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
      let user = await storage.getUserByEmail ? await storage.getUserByEmail(sanitizedEmail) : null;
      if (!user) {
        user = await storage.getUserByWhatsApp(sanitizedEmail);
      }
      if (!user) {
        user = await storage.createUser({
          name: sanitizedName,
          whatsappNumber: sanitizedWhatsapp,
          email: sanitizedEmail,
          city: sanitizedCity,
          profileCompleted: true
        });
        await storage.linkTokenToUser(parseInt(tokenId), user.id);
      } else {
        user = await storage.updateUser(user.id, {
          name: sanitizedName,
          whatsappNumber: sanitizedWhatsapp,
          city: sanitizedCity,
          email: sanitizedEmail,
          // Now store the email in the proper field
          profileCompleted: true
          // Mark profile as completed
        });
      }
      const accessToken = await storage.getAccessTokenById(parseInt(tokenId));
      if (accessToken && accessToken.ipAddress && accessToken.deviceFingerprint) {
        console.log(`[PROFILE] Creating/updating device session for user ${user.id} with token ${tokenId}`);
        let deviceSession = await storage.getDeviceSession(user.id, parseInt(tokenId));
        if (!deviceSession) {
          console.log(`[PROFILE] Creating new device session for user ${user.id}`);
          deviceSession = await storage.createDeviceSession(
            user.id,
            parseInt(tokenId),
            accessToken.ipAddress,
            accessToken.deviceFingerprint,
            req.headers["user-agent"]
          );
        } else {
          console.log(`[PROFILE] Using existing device session ${deviceSession.id}`);
        }
        await storage.updateDeviceSessionAccess(deviceSession.id);
      } else {
        console.log(`[PROFILE] Warning: Cannot create device session - missing token data:`, {
          hasToken: !!accessToken,
          hasIP: !!accessToken?.ipAddress,
          hasFingerprint: !!accessToken?.deviceFingerprint
        });
      }
      if (req.session) {
        req.session.userId = user.id;
        req.session.tokenId = tokenId;
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session:", err);
          }
          res.json({
            success: true,
            user,
            message: "User information updated successfully"
          });
        });
      } else {
        res.json({
          success: true,
          user,
          message: "User information updated successfully, but session could not be established"
        });
      }
    } catch (error) {
      console.error("Update user info error:", error);
      res.status(500).json({ message: "Failed to update user information" });
    }
  });
  app2.get("/api/products", requireTokenAuth, async (req, res) => {
    try {
      const { search, category, finish, material, sortBy, page = "1", limit = "50" } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;
      let products2;
      let total = 0;
      if (search) {
        products2 = await storage.searchProducts(search, limitNum, offset);
        total = await storage.getSearchCount(search);
      } else {
        products2 = await storage.filterProducts({
          category: category === "all" ? void 0 : category,
          finish: finish === "all" ? void 0 : finish,
          material: material === "all" ? void 0 : material,
          sortBy,
          limit: limitNum,
          offset
        });
        total = await storage.getFilterCount({
          category: category === "all" ? void 0 : category,
          finish: finish === "all" ? void 0 : finish,
          material: material === "all" ? void 0 : material
        });
      }
      res.json({
        products: products2,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/products", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/products/:id", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(parseInt(req.params.id), productData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/products/:id", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const success = await storage.deleteProduct(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/products/upload-excel", upload.single("excel"), async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      let products2 = [];
      console.log(`Processing file: ${req.file.originalname}, size: ${req.file.size}, type: ${fileExtension}`);
      if (fileExtension === ".xlsx" || fileExtension === ".xls") {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        console.log(`Excel data rows: ${data.length}, Sample row:`, data.length > 0 ? data[0] : "No data");
        products2 = data.map((row) => ({
          name: row.name || row.Name || "",
          code: row.code || row.Code || "",
          category: row.category || row.Category || "",
          length: parseFloat(row.length || row.Length || "0"),
          breadth: parseFloat(row.breadth || row.Breadth || "0"),
          height: parseFloat(row.height || row.Height || "0"),
          finish: row.finish || row.Finish || "",
          material: row.material || row.Material || "",
          imageUrl: row.imageUrl || row.ImageUrl || row.image_url || ""
        }));
      } else if (fileExtension === ".csv") {
        const data = [];
        await new Promise((resolve, reject) => {
          fs.createReadStream(req.file.path).pipe(csvParser()).on("data", (row) => {
            if (data.length < 2) {
              console.log("CSV row sample:", row);
            }
            data.push(row);
          }).on("end", resolve).on("error", reject);
        });
        console.log(`CSV data rows: ${data.length}`);
        const cleanedData = data.map((row) => {
          const cleanedRow = {};
          Object.keys(row).forEach((key) => {
            const cleanKey = key.replace(/^\uFEFF/, "").trim().toLowerCase();
            cleanedRow[cleanKey] = typeof row[key] === "string" ? row[key].trim() : row[key];
          });
          return cleanedRow;
        });
        console.log("Cleaned CSV row sample:", cleanedData[0]);
        const nameKeys = ["name", "product_name", "productname", "product name"];
        const codeKeys = ["code", "product_code", "productcode", "product code", "sku"];
        products2 = cleanedData.map((row) => {
          let name = "";
          let code = "";
          for (const key of nameKeys) {
            if (row[key] !== void 0 && row[key] !== null && row[key] !== "") {
              name = row[key];
              break;
            }
          }
          for (const key of codeKeys) {
            if (row[key] !== void 0 && row[key] !== null && row[key] !== "") {
              code = row[key];
              break;
            }
          }
          if (!name || !code) {
            for (const key in row) {
              const value = row[key];
              if (!value) continue;
              if (!name && key.toLowerCase().includes("name")) {
                name = value;
              }
              if (!code && (key.toLowerCase().includes("code") || key.toLowerCase().includes("sku"))) {
                code = value;
              }
            }
          }
          return {
            name,
            code,
            category: row.category || "",
            length: parseFloat(row.length || "0"),
            breadth: parseFloat(row.breadth || "0"),
            height: parseFloat(row.height || "0"),
            finish: row.finish || "",
            material: row.material || "",
            imageUrl: row.imageurl || row.image_url || ""
          };
        });
      } else {
        return res.status(400).json({ message: "Unsupported file format. Please upload XLSX, XLS, or CSV file." });
      }
      const validProducts = products2.filter((p) => p.name && p.code);
      console.log(`Total products: ${products2.length}, Valid products: ${validProducts.length}`);
      if (products2.length > 0 && validProducts.length === 0) {
        console.log("Sample invalid product:", products2[0]);
      }
      const createdProducts = await storage.bulkCreateProducts(validProducts);
      res.json({
        success: true,
        imported: createdProducts.length,
        total: products2.length
      });
    } catch (error) {
      console.error("Excel upload error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/wishlist/export/excel", async (req, res) => {
    try {
      const requestedUserId = req.query.userId ? parseInt(req.query.userId) : null;
      const adminId = req.session?.userId;
      let userId;
      if (requestedUserId && adminId) {
        const admin = await storage.getUser(adminId);
        if (!admin?.isAdmin) {
          return res.status(403).json({ message: "Admin access required to export other users' wishlists" });
        }
        userId = requestedUserId;
      } else {
        userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ message: "Not authenticated" });
        }
      }
      const wishlistItems = await storage.getWishlistByUser(userId);
      const user = await storage.getUser(userId);
      if (!wishlistItems.length) {
        return res.status(404).json({ message: "No items in wishlist" });
      }
      const workbook = XLSX.utils.book_new();
      const data = wishlistItems.map((item, index) => ({
        "No.": index + 1,
        "Code": item.product.code,
        "Name": item.product.name,
        "Category": item.product.category,
        "Material": item.product.material || "Not specified",
        "Dimensions (cm)": `${item.product.length}\xD7${item.product.breadth}\xD7${item.product.height}`,
        "Finish": item.product.finish
      }));
      const header = [
        ["Vmake Finessee - Customer Wishlist"],
        [`Customer: ${user?.name}`],
        [`Generated on: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`],
        [""],
        // Empty row for spacing
        []
        // Empty row before the actual headers
      ];
      const ws = XLSX.utils.aoa_to_sheet(header);
      if (!ws["!merges"]) ws["!merges"] = [];
      ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
      ws["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });
      ws["!merges"].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 5 } });
      XLSX.utils.sheet_add_json(ws, data, { origin: 5 });
      XLSX.utils.book_append_sheet(workbook, ws, "Wishlist");
      const filename = `Vmake_Finessee_Wishlist_${user?.name.replace(/\s+/g, "_")}_${Date.now()}.xlsx`;
      const filePath = path.join("uploads", filename);
      XLSX.writeFile(workbook, filePath);
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Error sending file:", err);
        }
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting file:", unlinkErr);
          }
        });
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/users", async (req, res) => {
    try {
      const adminId = req.session?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const users2 = await storage.getAllUsers();
      const sanitizedUsers = users2.map((user) => {
        const { password, ...rest } = user;
        return rest;
      });
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/admin/users/:userId", async (req, res) => {
    try {
      const adminId = req.session?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const wishlist = await storage.getWishlistByUser(userId);
      const { password, ...sanitizedUser } = user;
      res.json({
        user: sanitizedUser,
        wishlist
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/users", async (req, res) => {
    try {
      const adminId = req.session?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { name, whatsappNumber, email, password, isAdmin } = req.body;
      const existingUser = await storage.getUserByWhatsApp(whatsappNumber);
      if (existingUser) {
        return res.status(400).json({ message: "User with this WhatsApp number already exists" });
      }
      const user = await storage.createUser({ name, whatsappNumber });
      if (email || password || isAdmin) {
        const updates = {};
        if (email) {
          updates.email = email;
        }
        if (password) {
          updates.password = await hashPassword(password);
        }
        if (isAdmin) {
          updates.isAdmin = true;
          if (admin.isPrimaryAdmin) {
            updates.isPrimaryAdmin = false;
          } else {
            updates.isAdmin = false;
          }
        }
        await storage.updateUser(user.id, updates);
      }
      const updatedUser = await storage.getUser(user.id);
      const { password: _, ...sanitizedUser } = updatedUser;
      res.json(sanitizedUser);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/users/:id", async (req, res) => {
    try {
      const adminId = req.session?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const userId = parseInt(req.params.id);
      const { name, whatsappNumber, email, password, isAdmin, isPrimaryAdmin } = req.body;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.isPrimaryAdmin && !admin.isPrimaryAdmin) {
        return res.status(403).json({ message: "Only primary admin can modify another primary admin" });
      }
      const updates = {};
      if (name) updates.name = name;
      if (whatsappNumber) updates.whatsappNumber = whatsappNumber;
      if (email !== void 0) updates.email = email;
      if (password) updates.password = await hashPassword(password);
      if (admin.isPrimaryAdmin) {
        if (isAdmin !== void 0) updates.isAdmin = isAdmin;
        if (isPrimaryAdmin !== void 0) updates.isPrimaryAdmin = isPrimaryAdmin;
      }
      const updatedUser = await storage.updateUser(userId, updates);
      const { password: _, ...sanitizedUser } = updatedUser;
      res.json(sanitizedUser);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  app2.delete("/api/users/:id", async (req, res) => {
    try {
      const adminId = req.session?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.isPrimaryAdmin) {
        return res.status(403).json({ message: "Cannot delete primary admin" });
      }
      if (userId === adminId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/users/export", async (req, res) => {
    try {
      const adminId = req.session?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const users2 = await storage.getAllUsers();
      const workbook = XLSX.utils.book_new();
      const data = users2.map((user, index) => ({
        "No.": index + 1,
        "Name": user.name,
        "WhatsApp Number": user.whatsappNumber,
        "Email": user.email || "Not provided",
        "Admin": user.isAdmin ? "Yes" : "No",
        "Primary Admin": user.isPrimaryAdmin ? "Yes" : "No",
        "Registered On": new Date(user.createdAt).toLocaleDateString()
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, "Users");
      const filename = `Vmake_Finessee_Users_${Date.now()}.xlsx`;
      const filePath = path.join("uploads", filename);
      XLSX.writeFile(workbook, filePath);
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Error sending file:", err);
        }
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting file:", unlinkErr);
          }
        });
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  let mockFeedback = [
    {
      id: 1,
      userId: 1,
      productId: 1,
      customerName: "Priya Sharma",
      customerPhone: "+919876543210",
      rating: 5,
      title: "Absolutely Beautiful Brass Ganesha!",
      message: "The craftsmanship is exceptional. The intricate details on this brass Ganesha idol are stunning. It's become the centerpiece of our home temple. Highly recommend Vmake Finessee for authentic handcrafted pieces.",
      isApproved: true,
      isPublished: true,
      adminNotes: "Excellent feedback, customer very satisfied",
      createdAt: /* @__PURE__ */ new Date("2024-05-15"),
      updatedAt: /* @__PURE__ */ new Date("2024-05-15")
    },
    {
      id: 2,
      userId: 2,
      productId: 2,
      customerName: "Rajesh Kumar",
      customerPhone: "+919123456789",
      rating: 4,
      title: "Great Quality Home Decor",
      message: "Ordered a decorative brass bowl for our living room. The quality is excellent and the finish is perfect. Delivery was prompt. Will definitely order more items.",
      isApproved: false,
      isPublished: false,
      adminNotes: null,
      createdAt: /* @__PURE__ */ new Date("2024-05-20"),
      updatedAt: /* @__PURE__ */ new Date("2024-05-20")
    },
    {
      id: 3,
      userId: 3,
      productId: 1,
      customerName: "Meera Patel",
      customerPhone: "+919988776655",
      rating: 5,
      title: "Perfect for Diwali Decoration",
      message: "Bought this for Diwali and it was perfect! The brass work is authentic and the size is just right. My guests complimented the beautiful piece. Thank you Vmake Finessee!",
      isApproved: true,
      isPublished: true,
      adminNotes: "Good feedback, consider publishing",
      createdAt: /* @__PURE__ */ new Date("2024-05-25"),
      updatedAt: /* @__PURE__ */ new Date("2024-05-25")
    },
    {
      id: 4,
      userId: 4,
      productId: 3,
      customerName: "Anita Singh",
      customerPhone: "+919876543211",
      rating: 4,
      title: "Beautiful Craftsmanship",
      message: "The attention to detail in this brass piece is remarkable. It adds such elegance to our home. The packaging was also excellent. Highly recommended!",
      isApproved: true,
      isPublished: true,
      adminNotes: "Great customer satisfaction",
      createdAt: /* @__PURE__ */ new Date("2024-05-28"),
      updatedAt: /* @__PURE__ */ new Date("2024-05-28")
    },
    {
      id: 5,
      userId: 5,
      productId: 2,
      customerName: "Vikram Joshi",
      customerPhone: "+919123456788",
      rating: 5,
      title: "Exceeded Expectations",
      message: "The quality is outstanding! This brass artifact is even more beautiful in person. The finish is perfect and it arrived safely. Will definitely be a repeat customer.",
      isApproved: true,
      isPublished: true,
      adminNotes: "Excellent review",
      createdAt: /* @__PURE__ */ new Date("2024-05-30"),
      updatedAt: /* @__PURE__ */ new Date("2024-05-30")
    }
  ];
  app2.get("/api/feedback", async (req, res) => {
    try {
      const adminId = req.session?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      res.json(mockFeedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/feedback/published", async (_req, res) => {
    try {
      const publishedFeedback = mockFeedback.filter((f) => f.isPublished);
      res.json(publishedFeedback);
    } catch (error) {
      console.error("Error fetching published feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/feedback", async (req, res) => {
    try {
      const feedbackData = insertFeedbackSchema.parse(req.body);
      const newFeedback = {
        ...feedbackData,
        id: mockFeedback.length + 1,
        productId: feedbackData.productId || null,
        customerPhone: feedbackData.customerPhone || null,
        adminNotes: null,
        isApproved: false,
        isPublished: false,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      mockFeedback.push(newFeedback);
      res.status(201).json(newFeedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      res.status(400).json({ message: error.message });
    }
  });
  app2.put("/api/feedback/:id", async (req, res) => {
    try {
      const adminId = req.session?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const feedbackId = parseInt(req.params.id);
      const updates = req.body;
      const index = mockFeedback.findIndex((f) => f.id === feedbackId);
      if (index === -1) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      mockFeedback[index] = {
        ...mockFeedback[index],
        ...updates,
        updatedAt: /* @__PURE__ */ new Date()
      };
      res.json(mockFeedback[index]);
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.delete("/api/feedback/:id", async (req, res) => {
    try {
      const adminId = req.session?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const feedbackId = parseInt(req.params.id);
      const index = mockFeedback.findIndex((f) => f.id === feedbackId);
      if (index === -1) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      mockFeedback.splice(index, 1);
      res.json({ message: "Feedback deleted successfully" });
    } catch (error) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
var __dirname = path2.dirname(
  decodeURIComponent(new URL(import.meta.url).pathname)
);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    // Only include Replit plugins in development and when REPL_ID is present
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      (await import("@replit/vite-plugin-runtime-error-modal")).default(),
      (await import("@replit/vite-plugin-cartographer")).cartographer()
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(__dirname, "client", "src"),
      "@shared": path2.resolve(__dirname, "shared"),
      "@assets": path2.resolve(__dirname, "attached_assets")
    }
  },
  root: path2.resolve(__dirname, "client"),
  build: {
    outDir: path2.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __dirname2 = path3.dirname(
  decodeURIComponent(new URL(import.meta.url).pathname)
);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      console.log("Looking for template at:", clientTemplate);
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error("Error loading template:", e);
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(__dirname2, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import connectPgSimple from "connect-pg-simple";
import MemoryStore from "memorystore";
dotenv3.config();
var app = express2();
app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "blob:", "https://replit.com"],
      connectSrc: ["'self'", "ws:", "wss:", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  } : false,
  // Disable CSP in development for easier debugging
  crossOriginEmbedderPolicy: false
}));
var isDevelopment = process.env.NODE_ENV === "development";
var limiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: isDevelopment ? 1e3 : 1e3,
  // Generous limit for both dev and production
  message: {
    error: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return isDevelopment && (req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1");
  }
});
var loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: isDevelopment ? 100 : 10,
  // 10 login attempts per 15 minutes
  message: {
    error: "Too many login attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return isDevelopment && (req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1");
  }
});
var registerLimiter = rateLimit({
  windowMs: 5 * 60 * 1e3,
  // 5 minutes
  max: isDevelopment ? 100 : 5,
  // 5 registrations per 5 minutes
  message: {
    error: "Too many registration attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return isDevelopment && (req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1");
  }
});
if (!isDevelopment) {
  app.use(limiter);
  app.use("/api/auth/admin-login", loginLimiter);
  app.use("/api/auth/register", registerLimiter);
} else {
  console.log("Rate limiting disabled for development environment");
}
app.use(requestLogger);
app.use(cleanupExpiredData);
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
var isDevEnvironment = process.env.NODE_ENV === "development";
var sessionStore;
if (isDevEnvironment) {
  const MemoryStoreConstructor = MemoryStore(session);
  sessionStore = new MemoryStoreConstructor({
    checkPeriod: 864e5
    // prune expired entries every 24h
  });
} else {
  const PgSession = connectPgSimple(session);
  sessionStore = new PgSession({
    pool: pool || void 0,
    // Use the existing database pool
    tableName: "user_sessions",
    // Use a custom table name
    createTableIfMissing: true
  });
}
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "default-session-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1e3
    // 24 hours
  }
}));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  if (process.env.NODE_ENV === "production") {
    try {
      await initializeDatabase();
    } catch (error) {
      console.error("Failed to initialize database:", error);
      process.exit(1);
    }
  }
  const server = await registerRoutes(app);
  app.use("/api/*", notFoundHandler);
  app.use(errorHandler);
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT || 5500;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
