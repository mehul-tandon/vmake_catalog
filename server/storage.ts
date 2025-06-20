import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

import { users, products, wishlists, accessTokens, deviceSessions, otpVerifications, type User, type InsertUser, type Product, type InsertProduct, type Wishlist, type InsertWishlist } from "@shared/schema";
import { db } from "./db";
import { eq, or, sql, and, desc, asc, lt } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByWhatsApp(whatsappNumber: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserPassword(id: number, password: string): Promise<boolean>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Product operations
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductByCode(code: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  searchProducts(query: string, limit?: number, offset?: number): Promise<Product[]>;
  getSearchCount(query: string): Promise<number>;
  filterProducts(filters: { category?: string; finish?: string; material?: string; sortBy?: string; limit?: number; offset?: number }): Promise<Product[]>;
  getFilterCount(filters: { category?: string; finish?: string; material?: string }): Promise<number>;
  bulkCreateProducts(products: InsertProduct[]): Promise<Product[]>;

  // Wishlist operations
  getWishlistByUser(userId: number): Promise<(Wishlist & { product: Product })[]>;
  addToWishlist(wishlist: InsertWishlist): Promise<Wishlist>;
  removeFromWishlist(userId: number, productId: number): Promise<boolean>;
  isInWishlist(userId: number, productId: number): Promise<boolean>;

  // New methods for categories and finishes
  getCategories(): Promise<string[]>;
  getFinishes(): Promise<string[]>;
  getMaterials(): Promise<string[]>;

  // Dynamic filter methods that return only available options based on current selections
  getAvailableCategories(filters: { finish?: string; material?: string }): Promise<string[]>;
  getAvailableFinishes(filters: { category?: string; material?: string }): Promise<string[]>;
  getAvailableMaterials(filters: { category?: string; finish?: string }): Promise<string[]>;

  // Access token operations
  createAccessToken(email: string, userId?: number): Promise<{ token: string; tokenId: number }>;
  getAccessToken(token: string): Promise<any>;
  getAccessTokenById(tokenId: number): Promise<any>;
  getAllAccessTokens(): Promise<any[]>;
  linkTokenToUser(tokenId: number, userId: number): Promise<boolean>;
  markTokenAsUsed(tokenId: number, ipAddress: string, deviceFingerprint: string): Promise<boolean>;
  cleanupExpiredTokens(): Promise<void>;

  // Device session operations
  createDeviceSession(userId: number, tokenId: number, ipAddress: string, deviceFingerprint: string, userAgent?: string): Promise<any>;
  getDeviceSession(userId: number, tokenId: number): Promise<any>;
  getDeviceSessionByFingerprint(deviceFingerprint: string, ipAddress: string, activeOnly?: boolean): Promise<any>;
  validateDeviceAccess(userId: number, ipAddress: string, deviceFingerprint: string): Promise<boolean>;
  updateDeviceSessionAccess(sessionId: number): Promise<void>;
  deactivateDeviceSession(sessionId: number): Promise<boolean>;
  reactivateDeviceSession(sessionId: number): Promise<boolean>;

  // OTP verification operations
  createOTPVerification(email: string, tokenId: number, otpCode: string): Promise<any>;
  getOTPVerification(email: string, tokenId: number): Promise<any>;
  verifyOTP(email: string, tokenId: number, otpCode: string): Promise<{ success: boolean; attempts: number }>;
  incrementOTPAttempts(otpId: number): Promise<number>;
  cleanupExpiredOTPs(): Promise<void>;

  // Health check method
  testConnection(): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private wishlists: Map<number, Wishlist>;
  private accessTokens: Map<string, any>;
  private deviceSessions: Map<number, any>;
  private otpVerifications: Map<number, any>;
  private currentUserId: number;
  private currentProductId: number;
  private currentWishlistId: number;
  private currentTokenId: number;
  private currentSessionId: number;
  private currentOtpId: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.wishlists = new Map();
    this.accessTokens = new Map();
    this.deviceSessions = new Map();
    this.otpVerifications = new Map();
    this.currentUserId = 1;
    this.currentProductId = 1;
    this.currentWishlistId = 1;
    this.currentTokenId = 1;
    this.currentSessionId = 1;
    this.currentOtpId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    // Create admin user - hardcoded for development
    const adminWhatsApp = "+918882636296"; // Your WhatsApp number
    console.log("Creating admin user with WhatsApp:", adminWhatsApp);

    // Hash the default admin password
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const adminUser: User = {
      id: this.currentUserId++,
      name: "Admin User",
      whatsappNumber: adminWhatsApp,
      email: "admin@vmakefinessee.com",
      password: hashedPassword,
      isAdmin: true,
      isPrimaryAdmin: true,
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
    console.log("Admin user created:", { id: adminUser.id, whatsappNumber: adminUser.whatsappNumber, password: "admin123" });

    // Create sample products with multiple images
    const sampleProducts: any[] = [
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

    sampleProducts.forEach(product => {
      const newProduct: Product = {
        ...product,
        id: this.currentProductId++,
        material: product.material || "",
        imageUrl: product.imageUrl || null,
        imageUrls: product.imageUrls || null,
        description: product.description || null,
        status: product.status || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.products.set(newProduct.id, newProduct);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWhatsApp(whatsappNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.whatsappNumber === whatsappNumber,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      password: null,
      isAdmin: false,
      isPrimaryAdmin: false,
      createdAt: new Date(),
    };
    this.users.set(id, user);

    // Log user data to file for collection
    await this.logUserData(user);

    return user;
  }

  private async logUserData(user: User) {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const userData = {
        timestamp: new Date().toISOString(),
        name: user.name,
        whatsappNumber: user.whatsappNumber,
        id: user.id
      };

      const logEntry = JSON.stringify(userData) + '\n';
      const logPath = path.join(process.cwd(), 'user_data_log.txt');

      fs.appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error('Error logging user data:', error);
    }
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductByCode(code: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(
      (product) => product.code === code,
    );
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const product: Product = {
      ...insertProduct,
      id,
      material: insertProduct.material || "",
      imageUrl: insertProduct.imageUrl || null,
      imageUrls: (insertProduct as any).imageUrls || null,
      description: (insertProduct as any).description || null,
      status: (insertProduct as any).status || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const existing = this.products.get(id);
    if (!existing) return undefined;

    const updated: Product = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  async searchProducts(query: string, limit?: number, offset?: number): Promise<Product[]> {
    const lowercaseQuery = query.toLowerCase();
    let results = Array.from(this.products.values()).filter(
      (product) =>
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.code.toLowerCase().includes(lowercaseQuery) ||
        product.category.toLowerCase().includes(lowercaseQuery) ||
        product.finish.toLowerCase().includes(lowercaseQuery)
    );

    if (offset !== undefined) {
      results = results.slice(offset);
    }
    if (limit !== undefined) {
      results = results.slice(0, limit);
    }

    return results;
  }

  async getSearchCount(query: string): Promise<number> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.products.values()).filter(
      (product) =>
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.code.toLowerCase().includes(lowercaseQuery) ||
        product.category.toLowerCase().includes(lowercaseQuery) ||
        product.finish.toLowerCase().includes(lowercaseQuery)
    ).length;
  }

  async filterProducts(filters: { category?: string; finish?: string; material?: string; sortBy?: string; limit?: number; offset?: number }): Promise<Product[]> {
    let products = Array.from(this.products.values());

    if (filters.category) {
      products = products.filter(p => p.category === filters.category);
    }

    if (filters.finish) {
      products = products.filter(p => p.finish === filters.finish);
    }

    if (filters.material) {
      products = products.filter(p => p.material === filters.material);
    }

    // Sort products
    switch (filters.sortBy) {
      case 'code':
        products.sort((a, b) => a.code.localeCompare(b.code));
        break;
      case 'category':
        products.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'newest':
        products.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        break;
      default:
        products.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Apply pagination
    if (filters.offset !== undefined) {
      products = products.slice(filters.offset);
    }
    if (filters.limit !== undefined) {
      products = products.slice(0, filters.limit);
    }

    return products;
  }

  async getFilterCount(filters: { category?: string; finish?: string; material?: string }): Promise<number> {
    let products = Array.from(this.products.values());

    if (filters.category) {
      products = products.filter(p => p.category === filters.category);
    }

    if (filters.finish) {
      products = products.filter(p => p.finish === filters.finish);
    }

    if (filters.material) {
      products = products.filter(p => p.material === filters.material);
    }

    return products.length;
  }

  async bulkCreateProducts(insertProducts: InsertProduct[]): Promise<Product[]> {
    const products: Product[] = [];
    for (const insertProduct of insertProducts) {
      const id = this.currentProductId++;
      const product: Product = {
        ...insertProduct,
        id,
        material: insertProduct.material || "",
        imageUrl: insertProduct.imageUrl || null,
        imageUrls: (insertProduct as any).imageUrls || null,
        description: (insertProduct as any).description || null,
        status: (insertProduct as any).status || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.products.set(id, product);
      products.push(product);
    }
    return products;
  }

  async getWishlistByUser(userId: number): Promise<(Wishlist & { product: Product })[]> {
    const userWishlists = Array.from(this.wishlists.values()).filter(
      (wishlist) => wishlist.userId === userId
    );

    return userWishlists.map(wishlist => {
      const product = this.products.get(wishlist.productId);
      if (!product) throw new Error(`Product not found for wishlist item`);
      return { ...wishlist, product };
    });
  }

  async addToWishlist(insertWishlist: InsertWishlist): Promise<Wishlist> {
    const id = this.currentWishlistId++;
    const wishlist: Wishlist = {
      ...insertWishlist,
      id,
      createdAt: new Date(),
    };
    this.wishlists.set(id, wishlist);
    return wishlist;
  }

  async removeFromWishlist(userId: number, productId: number): Promise<boolean> {
    const wishlistItem = Array.from(this.wishlists.values()).find(
      (w) => w.userId === userId && w.productId === productId
    );

    if (!wishlistItem) return false;
    return this.wishlists.delete(wishlistItem.id);
  }

  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    return Array.from(this.wishlists.values()).some(
      (w) => w.userId === userId && w.productId === productId
    );
  }

  // New methods for categories and finishes
  async getCategories(): Promise<string[]> {
    const allProducts = Array.from(this.products.values());
    const categories = new Set<string>();

    allProducts.forEach(product => {
      if (product.category) {
        categories.add(product.category);
      }
    });

    return Array.from(categories);
  }

  async getFinishes(): Promise<string[]> {
    const allProducts = Array.from(this.products.values());
    const finishes = new Set<string>();

    allProducts.forEach(product => {
      if (product.finish) {
        finishes.add(product.finish);
      }
    });

    return Array.from(finishes);
  }

  async getMaterials(): Promise<string[]> {
    const allProducts = Array.from(this.products.values());
    const materials = new Set<string>();

    allProducts.forEach(product => {
      if (product.material) {
        materials.add(product.material);
      }
    });

    return Array.from(materials);
  }

  // Dynamic filter methods that return only available options based on current selections
  async getAvailableCategories(filters: { finish?: string; material?: string }): Promise<string[]> {
    let products = Array.from(this.products.values());

    // Filter products based on current selections
    if (filters.finish) {
      products = products.filter(p => p.finish === filters.finish);
    }
    if (filters.material) {
      products = products.filter(p => p.material === filters.material);
    }

    // Get unique categories from filtered products
    const categories = new Set<string>();
    products.forEach(product => {
      if (product.category) {
        categories.add(product.category);
      }
    });

    return Array.from(categories).sort();
  }

  async getAvailableFinishes(filters: { category?: string; material?: string }): Promise<string[]> {
    let products = Array.from(this.products.values());

    // Filter products based on current selections
    if (filters.category) {
      products = products.filter(p => p.category === filters.category);
    }
    if (filters.material) {
      products = products.filter(p => p.material === filters.material);
    }

    // Get unique finishes from filtered products
    const finishes = new Set<string>();
    products.forEach(product => {
      if (product.finish) {
        finishes.add(product.finish);
      }
    });

    return Array.from(finishes).sort();
  }

  async getAvailableMaterials(filters: { category?: string; finish?: string }): Promise<string[]> {
    let products = Array.from(this.products.values());

    // Filter products based on current selections
    if (filters.category) {
      products = products.filter(p => p.category === filters.category);
    }
    if (filters.finish) {
      products = products.filter(p => p.finish === filters.finish);
    }

    // Get unique materials from filtered products
    const materials = new Set<string>();
    products.forEach(product => {
      if (product.material) {
        materials.add(product.material);
      }
    });

    return Array.from(materials).sort();
  }

  // Add new method to get all users
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserPassword(id: number, password: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    user.password = password;
    this.users.set(id, user);
    return true;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    // Don't allow changing primary admin status unless by a primary admin
    if (data.isPrimaryAdmin !== undefined && !user.isPrimaryAdmin) {
      data.isPrimaryAdmin = false;
    }

    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    // Don't allow deleting primary admin
    const user = this.users.get(id);
    if (!user || user.isPrimaryAdmin) return false;

    return this.users.delete(id);
  }

  // Security methods - simplified implementations for development
  async createAccessToken(email: string, userId?: number): Promise<{ token: string; tokenId: number }> {
    // Generate a simple token for development
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const tokenId = this.currentTokenId++;
    // Remove expiration - tokens never expire, only IP-bound

    const accessToken = {
      id: tokenId,
      token,
      userId,
      email,
      isUsed: false,
      ipAddress: null,
      deviceFingerprint: null,
      expiresAt: null, // Never expires
      usedAt: null,
      createdAt: new Date()
    };

    this.accessTokens.set(token, accessToken);
    console.log(`[DEV] Created access token for ${email}: ${token}`);
    return { token, tokenId };
  }

  async getAccessToken(token: string): Promise<any> {
    console.log(`[DEV] Getting access token: ${token}`);
    console.log(`[DEV] Available tokens:`, Array.from(this.accessTokens.keys()));
    const result = this.accessTokens.get(token) || null;
    console.log(`[DEV] Token found:`, result ? 'YES' : 'NO');
    return result;
  }

  async getAccessTokenById(tokenId: number): Promise<any> {
    console.log(`[DEV] Getting access token by ID: ${tokenId}`);
    // Find token by ID
    for (const [token, accessToken] of this.accessTokens.entries()) {
      if (accessToken.id === tokenId) {
        return accessToken;
      }
    }
    return null;
  }

  async getAllAccessTokens(): Promise<any[]> {
    console.log(`[DEV] Getting all access tokens`);
    return Array.from(this.accessTokens.values());
  }

  async linkTokenToUser(tokenId: number, userId: number): Promise<boolean> {
    console.log(`[DEV] Linking token ${tokenId} to user ${userId}`);
    // Find token by ID
    for (const [token, accessToken] of this.accessTokens.entries()) {
      if (accessToken.id === tokenId) {
        accessToken.userId = userId;
        return true;
      }
    }
    return false;
  }



  async markTokenAsUsed(tokenId: number, ipAddress: string, deviceFingerprint: string): Promise<boolean> {
    console.log(`[DEV] Marking token ${tokenId} as used from ${ipAddress}`);
    // Find token by ID
    for (const [token, accessToken] of this.accessTokens.entries()) {
      if (accessToken.id === tokenId) {
        accessToken.isUsed = true;
        accessToken.usedAt = new Date();
        accessToken.ipAddress = ipAddress;
        accessToken.deviceFingerprint = deviceFingerprint;
        return true;
      }
    }
    return false;
  }

  async cleanupExpiredTokens(): Promise<void> {
    console.log('[DEV] Cleaning up expired tokens');
    // Tokens never expire, so no cleanup needed
    // This method is kept for compatibility but does nothing
  }

  async createDeviceSession(userId: number, tokenId: number, ipAddress: string, deviceFingerprint: string, userAgent?: string): Promise<any> {
    console.log(`[DEV] Creating device session for user ${userId} from ${ipAddress}`);
    const sessionId = this.currentSessionId++;
    const session = {
      id: sessionId,
      userId,
      tokenId,
      ipAddress,
      deviceFingerprint,
      userAgent,
      isActive: true,
      lastAccessAt: new Date(),
      createdAt: new Date()
    };
    this.deviceSessions.set(sessionId, session);
    return session;
  }

  async getDeviceSession(userId: number, tokenId: number): Promise<any> {
    console.log(`[DEV] Getting device session for user ${userId}, token ${tokenId}`);
    for (const [id, session] of this.deviceSessions.entries()) {
      if (session.userId === userId && session.tokenId === tokenId && session.isActive) {
        return session;
      }
    }
    return null;
  }

  async getDeviceSessionByFingerprint(deviceFingerprint: string, ipAddress: string, activeOnly: boolean = false): Promise<any> {
    console.log(`[DEV] Getting device session by fingerprint ${deviceFingerprint.substring(0, 8)}... from ${ipAddress} (activeOnly: ${activeOnly})`);
    for (const [id, session] of this.deviceSessions.entries()) {
      if (session.deviceFingerprint === deviceFingerprint && session.ipAddress === ipAddress) {
        // If activeOnly is true, only return active sessions
        if (activeOnly && !session.isActive) {
          continue;
        }
        return session;
      }
    }
    return null;
  }

  async validateDeviceAccess(userId: number, ipAddress: string, deviceFingerprint: string): Promise<boolean> {
    console.log(`[DEV] Validating device access for user ${userId} from ${ipAddress}`);
    // In development, allow all access for now
    return true;
  }

  async updateDeviceSessionAccess(sessionId: number): Promise<void> {
    console.log(`[DEV] Updating device session access: ${sessionId}`);
    const session = this.deviceSessions.get(sessionId);
    if (session) {
      session.lastAccessAt = new Date();
    }
  }

  async deactivateDeviceSession(sessionId: number): Promise<boolean> {
    console.log(`[DEV] Deactivating device session: ${sessionId}`);
    const session = this.deviceSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.lastAccessAt = new Date();
      return true;
    }
    return false;
  }

  async reactivateDeviceSession(sessionId: number): Promise<boolean> {
    console.log(`[DEV] Reactivating device session: ${sessionId}`);
    const session = this.deviceSessions.get(sessionId);
    if (session) {
      session.isActive = true;
      session.lastAccessAt = new Date();
      return true;
    }
    return false;
  }

  async createOTPVerification(email: string, tokenId: number, otpCode: string): Promise<any> {
    console.log(`[DEV] Creating OTP verification for ${email}: ${otpCode}`);
    const otpId = this.currentOtpId++;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const otp = {
      id: otpId,
      email,
      tokenId,
      otpCode,
      attempts: 0,
      isVerified: false,
      expiresAt,
      verifiedAt: null,
      createdAt: new Date()
    };

    this.otpVerifications.set(otpId, otp);
    return otp;
  }

  async getOTPVerification(email: string, tokenId: number): Promise<any> {
    console.log(`[DEV] Getting OTP verification for ${email}, token ${tokenId}`);
    for (const [id, otp] of this.otpVerifications.entries()) {
      if (otp.email === email && otp.tokenId === tokenId && !otp.isVerified) {
        return otp;
      }
    }
    return null;
  }

  async verifyOTP(email: string, tokenId: number, otpCode: string): Promise<{ success: boolean; attempts: number }> {
    console.log(`[DEV] Verifying OTP for ${email}: ${otpCode}`);
    const otp = await this.getOTPVerification(email, tokenId);

    if (!otp) {
      return { success: false, attempts: 0 };
    }

    // Check if OTP is expired
    if (new Date() > otp.expiresAt) {
      return { success: false, attempts: otp.attempts };
    }

    // Check if too many attempts
    if (otp.attempts >= 3) {
      return { success: false, attempts: otp.attempts };
    }

    // Increment attempts
    const newAttempts = await this.incrementOTPAttempts(otp.id);

    // Check if OTP matches
    if (otp.otpCode === otpCode) {
      // Mark as verified
      otp.isVerified = true;
      otp.verifiedAt = new Date();
      return { success: true, attempts: newAttempts };
    }

    return { success: false, attempts: newAttempts };
  }

  async incrementOTPAttempts(otpId: number): Promise<number> {
    console.log(`[DEV] Incrementing OTP attempts: ${otpId}`);
    const otp = this.otpVerifications.get(otpId);
    if (otp) {
      otp.attempts++;
      return otp.attempts;
    }
    return 0;
  }

  async cleanupExpiredOTPs(): Promise<void> {
    console.log('[DEV] Cleaning up expired OTPs');
    const now = new Date();
    for (const [id, otp] of this.otpVerifications.entries()) {
      if (otp.expiresAt < now) {
        this.otpVerifications.delete(id);
      }
    }
  }

  async testConnection(): Promise<boolean> {
    // For memory storage, always return true since it's always available
    return true;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByWhatsApp(whatsappNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.whatsappNumber, whatsappNumber));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();

    // Log user data to file for collection
    await this.logUserData(user);

    return user;
  }

  private async logUserData(user: User) {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const userData = {
        timestamp: new Date().toISOString(),
        name: user.name,
        whatsappNumber: user.whatsappNumber,
        id: user.id
      };

      const logEntry = JSON.stringify(userData) + '\n';
      const logPath = path.join(process.cwd(), 'user_data_log.txt');

      fs.appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error('Error logging user data:', error);
    }
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductByCode(code: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.code, code));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values({
        ...insertProduct,
        imageUrl: insertProduct.imageUrl || null
      })
      .returning();
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({
        ...updateData,
        imageUrl: updateData.imageUrl || null,
        updatedAt: new Date()
      })
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount > 0;
  }

  async searchProducts(query: string, limit?: number, offset?: number): Promise<Product[]> {
    const lowercaseQuery = `%${query.toLowerCase()}%`;
    let searchQuery = db.select().from(products).where(
      or(
        sql`LOWER(${products.name}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.code}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.category}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.finish}) LIKE ${lowercaseQuery}`
      )
    );

    if (limit !== undefined) {
      searchQuery = searchQuery.limit(limit);
    }
    if (offset !== undefined) {
      searchQuery = searchQuery.offset(offset);
    }

    return await searchQuery;
  }

  async getSearchCount(query: string): Promise<number> {
    const lowercaseQuery = `%${query.toLowerCase()}%`;
    const result = await db.select({ count: sql<number>`count(*)` }).from(products).where(
      or(
        sql`LOWER(${products.name}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.code}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.category}) LIKE ${lowercaseQuery}`,
        sql`LOWER(${products.finish}) LIKE ${lowercaseQuery}`
      )
    );
    return result[0]?.count || 0;
  }

  async filterProducts(filters: { category?: string; finish?: string; material?: string; sortBy?: string; limit?: number; offset?: number }): Promise<Product[]> {
    let query = db.select().from(products);

    // Build WHERE conditions
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

    // Apply WHERE conditions if any
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    // Apply ORDER BY
    switch (filters.sortBy) {
      case 'code':
        query = query.orderBy(asc(products.code));
        break;
      case 'category':
        query = query.orderBy(asc(products.category));
        break;
      case 'newest':
        query = query.orderBy(desc(products.createdAt));
        break;
      default:
        query = query.orderBy(asc(products.name));
    }

    // Apply pagination
    if (filters.limit !== undefined) {
      query = query.limit(filters.limit);
    }
    if (filters.offset !== undefined) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async getFilterCount(filters: { category?: string; finish?: string; material?: string }): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)` }).from(products);

    // Build WHERE conditions
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

    // Apply WHERE conditions if any
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    const result = await query;
    return result[0]?.count || 0;
  }

  async bulkCreateProducts(insertProducts: InsertProduct[]): Promise<Product[]> {
    const formattedProducts = insertProducts.map(p => ({
      ...p,
      imageUrl: p.imageUrl || null
    }));

    const createdProducts = await db
      .insert(products)
      .values(formattedProducts)
      .returning();

    return createdProducts;
  }

  async getWishlistByUser(userId: number): Promise<(Wishlist & { product: Product })[]> {
    const wishlistWithProducts = await db
      .select({
        id: wishlists.id,
        userId: wishlists.userId,
        productId: wishlists.productId,
        createdAt: wishlists.createdAt,
        product: products
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.userId, userId));

    return wishlistWithProducts;
  }

  async addToWishlist(insertWishlist: InsertWishlist): Promise<Wishlist> {
    const [wishlist] = await db
      .insert(wishlists)
      .values(insertWishlist)
      .returning();
    return wishlist;
  }

  async removeFromWishlist(userId: number, productId: number): Promise<boolean> {
    const result = await db
      .delete(wishlists)
      .where(eq(wishlists.userId, userId) && eq(wishlists.productId, productId));
    return result.rowCount > 0;
  }

  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    const [wishlistItem] = await db
      .select()
      .from(wishlists)
      .where(eq(wishlists.userId, userId) && eq(wishlists.productId, productId));
    return !!wishlistItem;
  }

  // New methods for categories and finishes
  async getCategories(): Promise<string[]> {
    const result = await db.selectDistinct({ category: products.category }).from(products);
    return result.map((r: any) => r.category).filter(Boolean);
  }

  async getFinishes(): Promise<string[]> {
    const result = await db.selectDistinct({ finish: products.finish }).from(products);
    return result.map((r: any) => r.finish).filter(Boolean);
  }

  async getMaterials(): Promise<string[]> {
    const result = await db.selectDistinct({ material: products.material }).from(products);
    return result.map((r: any) => r.material).filter(Boolean);
  }

  // Add new method to get all users
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserPassword(id: number, password: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    // Check if user exists and is primary admin if trying to modify admin privileges
    if (data.isPrimaryAdmin !== undefined || data.isAdmin !== undefined) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) return undefined;

      // Don't allow changing primary admin status unless by another primary admin
      if (data.isPrimaryAdmin !== undefined && !user.isPrimaryAdmin) {
        data.isPrimaryAdmin = false;
      }
    }

    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    // Check if user is primary admin
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user || user.isPrimaryAdmin) return false;

    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // Dynamic filter methods that return only available options based on current selections
  async getAvailableCategories(filters: { finish?: string; material?: string }): Promise<string[]> {
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
    return result.map((r: any) => r.category).filter(Boolean).sort();
  }

  async getAvailableFinishes(filters: { category?: string; material?: string }): Promise<string[]> {
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
    return result.map((r: any) => r.finish).filter(Boolean).sort();
  }

  async getAvailableMaterials(filters: { category?: string; finish?: string }): Promise<string[]> {
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
    return result.map((r: any) => r.material).filter(Boolean).sort();
  }

  // Access token operations
  async createAccessToken(email: string, userId?: number): Promise<{ token: string; tokenId: number }> {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    // Remove expiration - tokens never expire, only IP-bound

    const [accessToken] = await db
      .insert(accessTokens)
      .values({
        token,
        userId,
        email,
        expiresAt: new Date('2099-12-31'), // Never expires (far future date)
        isUsed: false
      })
      .returning();

    return { token, tokenId: accessToken.id };
  }

  async getAccessToken(token: string): Promise<any> {
    const [accessToken] = await db
      .select()
      .from(accessTokens)
      .where(eq(accessTokens.token, token));
    return accessToken;
  }

  async getAccessTokenById(tokenId: number): Promise<any> {
    const [accessToken] = await db
      .select()
      .from(accessTokens)
      .where(eq(accessTokens.id, tokenId));
    return accessToken;
  }

  async getAllAccessTokens(): Promise<any[]> {
    const tokens = await db
      .select({
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
      })
      .from(accessTokens)
      .leftJoin(users, eq(accessTokens.userId, users.id))
      .orderBy(desc(accessTokens.createdAt));
    return tokens;
  }

  async linkTokenToUser(tokenId: number, userId: number): Promise<boolean> {
    const result = await db
      .update(accessTokens)
      .set({ userId })
      .where(eq(accessTokens.id, tokenId));
    return result.rowCount > 0;
  }



  async markTokenAsUsed(tokenId: number, ipAddress: string, deviceFingerprint: string): Promise<boolean> {
    const result = await db
      .update(accessTokens)
      .set({
        isUsed: true,
        usedAt: new Date(),
        ipAddress,
        deviceFingerprint
      })
      .where(eq(accessTokens.id, tokenId));
    return result.rowCount > 0;
  }

  async cleanupExpiredTokens(): Promise<void> {
    // Tokens never expire, so no cleanup needed
    // This method is kept for compatibility but does nothing
  }

  // Device session operations
  async createDeviceSession(userId: number, tokenId: number, ipAddress: string, deviceFingerprint: string, userAgent?: string): Promise<any> {
    const [session] = await db
      .insert(deviceSessions)
      .values({
        userId,
        tokenId,
        ipAddress,
        deviceFingerprint,
        userAgent,
        isActive: true
      })
      .returning();
    return session;
  }

  async getDeviceSession(userId: number, tokenId: number): Promise<any> {
    const [session] = await db
      .select()
      .from(deviceSessions)
      .where(and(
        eq(deviceSessions.userId, userId),
        eq(deviceSessions.tokenId, tokenId),
        eq(deviceSessions.isActive, true)
      ));
    return session;
  }

  async getDeviceSessionByFingerprint(deviceFingerprint: string, ipAddress: string, activeOnly: boolean = false): Promise<any> {
    let query = db
      .select()
      .from(deviceSessions)
      .where(and(
        eq(deviceSessions.deviceFingerprint, deviceFingerprint),
        eq(deviceSessions.ipAddress, ipAddress)
      ));
    
    // Add active filter only if requested
    if (activeOnly) {
      query = query.where(eq(deviceSessions.isActive, true));
    }
    
    const [session] = await query;
    return session;
  }

  async validateDeviceAccess(userId: number, ipAddress: string, deviceFingerprint: string): Promise<boolean> {
    const [session] = await db
      .select()
      .from(deviceSessions)
      .where(and(
        eq(deviceSessions.userId, userId),
        eq(deviceSessions.ipAddress, ipAddress),
        eq(deviceSessions.deviceFingerprint, deviceFingerprint),
        eq(deviceSessions.isActive, true)
      ));
    return !!session;
  }

  async updateDeviceSessionAccess(sessionId: number): Promise<void> {
    await db
      .update(deviceSessions)
      .set({ lastAccessAt: new Date() })
      .where(eq(deviceSessions.id, sessionId));
  }
  
  async deactivateDeviceSession(sessionId: number): Promise<boolean> {
    const result = await db
      .update(deviceSessions)
      .set({ 
        isActive: false,
        lastAccessAt: new Date()
      })
      .where(eq(deviceSessions.id, sessionId));
    
    return result.rowCount > 0;
  }
  
  async reactivateDeviceSession(sessionId: number): Promise<boolean> {
    const result = await db
      .update(deviceSessions)
      .set({ 
        isActive: true,
        lastAccessAt: new Date()
      })
      .where(eq(deviceSessions.id, sessionId));
    
    return result.rowCount > 0;
  }

  // OTP verification operations
  async createOTPVerification(email: string, tokenId: number, otpCode: string): Promise<any> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const [otp] = await db
      .insert(otpVerifications)
      .values({
        email,
        tokenId,
        otpCode,
        expiresAt,
        attempts: 0,
        isVerified: false
      })
      .returning();
    return otp;
  }

  async getOTPVerification(email: string, tokenId: number): Promise<any> {
    const [otp] = await db
      .select()
      .from(otpVerifications)
      .where(and(
        eq(otpVerifications.email, email),
        eq(otpVerifications.tokenId, tokenId),
        eq(otpVerifications.isVerified, false)
      ))
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);
    return otp;
  }

  async verifyOTP(email: string, tokenId: number, otpCode: string): Promise<{ success: boolean; attempts: number }> {
    const otp = await this.getOTPVerification(email, tokenId);

    if (!otp) {
      return { success: false, attempts: 0 };
    }

    // Check if OTP is expired
    if (new Date() > new Date(otp.expiresAt)) {
      return { success: false, attempts: otp.attempts };
    }

    // Check if too many attempts
    if (otp.attempts >= 3) {
      return { success: false, attempts: otp.attempts };
    }

    // Increment attempts
    const newAttempts = await this.incrementOTPAttempts(otp.id);

    // Check if OTP matches
    if (otp.otpCode === otpCode) {
      // Mark as verified
      await db
        .update(otpVerifications)
        .set({
          isVerified: true,
          verifiedAt: new Date()
        })
        .where(eq(otpVerifications.id, otp.id));

      return { success: true, attempts: newAttempts };
    }

    return { success: false, attempts: newAttempts };
  }

  async incrementOTPAttempts(otpId: number): Promise<number> {
    const [updated] = await db
      .update(otpVerifications)
      .set({
        attempts: sql`${otpVerifications.attempts} + 1`
      })
      .where(eq(otpVerifications.id, otpId))
      .returning({ attempts: otpVerifications.attempts });

    return updated?.attempts || 0;
  }

  async cleanupExpiredOTPs(): Promise<void> {
    await db
      .delete(otpVerifications)
      .where(lt(otpVerifications.expiresAt, new Date()));
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try to execute a simple query to test the database connection
      await db.select().from(users).limit(1);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

// Use MemStorage in development mode and DatabaseStorage in production
const isDev = process.env.NODE_ENV === 'development';

export const storage = isDev ? new MemStorage() : new DatabaseStorage();
