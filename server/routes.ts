import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertWishlistSchema, insertFeedbackSchema, adminLoginSchema, type User, type Feedback } from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcrypt";
import csvParser from "csv-parser";
import { initializeDatabase } from "./migrate";
import { emailService } from "./email";
import { requireTokenAuth, requireAdmin } from "./middleware";
import {
  generateOTP,
  generateAccessToken,
  createDeviceFingerprint,
  getClientIP,
  isValidEmail,
  isTokenExpired,
  sanitizeInput
} from "./security-utils";
import { requireTokenAuth, rateLimitTokenGeneration } from "./middleware";

// Configure multer with increased file size limit (100MB)
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB in bytes
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Hash password function
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password function
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
    try {
      // Test database connection
      const result = await storage.testConnection();
      res.json({
        status: 'healthy',
        database: result ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Database initialization endpoint (for production deployment) - GET version
  app.get('/api/init-db', async (_req, res) => {
    try {
      console.log('Database initialization requested via GET');
      await initializeDatabase();
      res.json({ message: 'Database initialized successfully' });
    } catch (error) {
      console.error('Database initialization error:', error);
      res.status(500).json({ error: 'Failed to initialize database' });
    }
  });

  // Database initialization endpoint (for production deployment) - POST version
  app.post('/api/init-db', async (req, res) => {
    try {
      console.log('Database initialization requested');
      const { initKey } = req.body;

      const validKeys = [process.env.SESSION_SECRET, 'default-init-key'];
      if (!validKeys.includes(initKey)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await initializeDatabase();
      res.json({ message: 'Database initialized successfully' });
    } catch (error) {
      console.error('Database initialization error:', error);
      res.status(500).json({ error: 'Failed to initialize database' });
    }
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
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

      // Set session
      if (req.session) {
        (req.session as any).userId = user.id;
      }

      res.json({ user, success: true });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({
        message: error.message.includes("require")
          ? "Registration failed. Please try again."
          : error.message
      });
    }
  });

  // Add categories and finishes API endpoints
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/finishes", async (_req, res) => {
    try {
      const finishes = await storage.getFinishes();
      res.json(finishes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/materials", async (_req, res) => {
    try {
      const materials = await storage.getMaterials();
      res.json(materials);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Dynamic filter endpoints that return only available options based on current selections
  app.get("/api/filters/categories", async (req, res) => {
    try {
      const { finish, material } = req.query;
      const categories = await storage.getAvailableCategories({
        finish: finish === "all" ? undefined : finish as string,
        material: material === "all" ? undefined : material as string,
      });
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/filters/finishes", async (req, res) => {
    try {
      const { category, material } = req.query;
      const finishes = await storage.getAvailableFinishes({
        category: category === "all" ? undefined : category as string,
        material: material === "all" ? undefined : material as string,
      });
      res.json(finishes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/filters/materials", async (req, res) => {
    try {
      const { category, finish } = req.query;
      const materials = await storage.getAvailableMaterials({
        category: category === "all" ? undefined : category as string,
        finish: finish === "all" ? undefined : finish as string,
      });
      res.json(materials);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Wishlist API endpoints
  app.get("/api/wishlist", requireTokenAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const wishlist = await storage.getWishlistByUser(userId);
      res.json(wishlist);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/wishlist", requireTokenAuth, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { productId } = insertWishlistSchema.parse({ ...req.body, userId });

      // Check if already in wishlist
      const isInWishlist = await storage.isInWishlist(userId, productId);
      if (isInWishlist) {
        return res.status(400).json({ message: "Product already in wishlist" });
      }

      const wishlist = await storage.addToWishlist({ userId, productId });
      res.json(wishlist);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/wishlist/:productId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const productId = parseInt(req.params.productId);
      const success = await storage.removeFromWishlist(userId, productId);

      if (!success) {
        return res.status(404).json({ message: "Item not found in wishlist" });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin login route
  app.post("/api/auth/admin-login", async (req, res) => {
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

      // For users without a password yet (backward compatibility)
      if (!user.password) {
        // Set password for existing admin accounts
        console.log("Setting password for admin without password");
        const hashedPassword = await hashPassword(password);
        await storage.updateUserPassword(user.id, hashedPassword);
      } else {
        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password);
        console.log("Password verification result:", isPasswordValid);

        if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid admin credentials" });
        }
      }

      // Set session
      if (req.session) {
        (req.session as any).userId = user.id;
        console.log("Session set with userId:", user.id);
      } else {
        console.error("No session object available");
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user as any;

      res.json({ user: userWithoutPassword, success: true });
    } catch (error: any) {
      console.error("Admin login error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      // Get the current user ID from the session before destroying it
      const userId = (req.session as any)?.userId;
      
      // Get client information before destroying the session
      const clientIP = getClientIP(req);
      const userAgent = req.headers['user-agent'] || '';
      const deviceFingerprint = createDeviceFingerprint(userAgent, clientIP, req.headers['accept-language'] as string);
      
      let boundUser = null;
      
      try {
        // Try to find a device session for this IP/fingerprint (include both active and inactive)
        const deviceSession = await storage.getDeviceSessionByFingerprint(deviceFingerprint, clientIP, false);
        
        if (deviceSession && deviceSession.userId) {
          // Get the user associated with this device session
          boundUser = await storage.getUser(deviceSession.userId);
          console.log(`[LOGOUT] Found bound user ${boundUser?.name} (${boundUser?.id}) for IP ${clientIP}`);
          
          // Deactivate the current device session (but keep it in the database for future login)
          if (deviceSession.id) {
            try {
              const deactivated = await storage.deactivateDeviceSession(deviceSession.id);
              console.log(`[LOGOUT] Device session ${deviceSession.id} deactivated: ${deactivated}`);
            } catch (sessionError) {
              console.error("[LOGOUT] Error deactivating device session:", sessionError);
              // Continue with logout even if deactivation fails
            }
          }
        }
      } catch (deviceError) {
        console.error("[LOGOUT] Error handling device session:", deviceError);
        // Continue with logout even if device session handling fails
      }
      
      // Prepare the response data before destroying the session
      const responseData = { 
        success: true,
        boundUser: boundUser ? {
          id: boundUser.id,
          name: boundUser.name,
          email: boundUser.email || boundUser.whatsappNumber
        } : null
      };
      
      // Clear all cookies
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      // Destroy the session
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
      // Even if there's an error, try to clear cookies and destroy session
      try {
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
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

  // Endpoint to log back in as the bound user
  app.post("/api/auth/login-bound-user", async (req, res) => {
    try {
      // Get client information
      const clientIP = getClientIP(req);
      const userAgent = req.headers['user-agent'] || '';
      const deviceFingerprint = createDeviceFingerprint(userAgent, clientIP, req.headers['accept-language'] as string);
      
      console.log(`[LOGIN-BOUND] Attempting to find device session for fingerprint ${deviceFingerprint.substring(0, 8)}... from ${clientIP}`);
      
      // Try to find a device session for this IP/fingerprint (include inactive sessions)
      const deviceSession = await storage.getDeviceSessionByFingerprint(deviceFingerprint, clientIP, false);
      
      if (!deviceSession) {
        console.log(`[LOGIN-BOUND] No device session found for fingerprint ${deviceFingerprint.substring(0, 8)}... from ${clientIP}`);
        return res.status(401).json({ message: "No bound user found for this device" });
      }
      
      if (!deviceSession.userId) {
        console.log(`[LOGIN-BOUND] Device session found but has no userId for fingerprint ${deviceFingerprint.substring(0, 8)}... from ${clientIP}`);
        return res.status(401).json({ message: "No bound user found for this device" });
      }
      
      // Get the user associated with this device session
      const boundUser = await storage.getUser(deviceSession.userId);
      
      if (!boundUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`[LOGIN] Logging in bound user ${boundUser.name} (${boundUser.id}) for IP ${clientIP}`);
      
      // Reactivate the device session
      try {
        if (deviceSession.id) {
          if (!deviceSession.isActive) {
            const reactivated = await storage.reactivateDeviceSession(deviceSession.id);
            console.log(`[LOGIN] Device session ${deviceSession.id} reactivated: ${reactivated}`);
          } else {
            // Update last access time
            await storage.updateDeviceSessionAccess(deviceSession.id);
            console.log(`[LOGIN] Device session ${deviceSession.id} access time updated`);
          }
        } else {
          console.log(`[LOGIN] Device session has no ID, cannot reactivate`);
        }
      } catch (error) {
        console.error(`[LOGIN] Error reactivating device session:`, error);
        // Continue with login even if reactivation fails
      }
      
      // Set session
      if (req.session) {
        (req.session as any).userId = boundUser.id;
        (req.session as any).tokenId = deviceSession.tokenId;
        
        // Save the session explicitly
        req.session.save(err => {
          if (err) {
            console.error("Error saving session:", err);
            return res.status(500).json({ message: "Could not establish session" });
          }
          
          // Return success with user info
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
    } catch (error: any) {
      console.error("Login bound user error:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  // Test endpoint to clear session (development only)
  app.post("/api/auth/clear-session", async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ message: "Not found" });
    }

    console.log(`[TEST] Clearing session for testing purposes`);
    if (req.session) {
      (req.session as any).userId = undefined;
      (req.session as any).tokenId = undefined;
    }
    res.json({ success: true, message: "Session cleared for testing" });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = (req.session as any)?.userId;

    // Helper function to try device-based authentication
    const tryDeviceAuthentication = async () => {
      const clientIP = getClientIP(req);
      const userAgent = req.headers['user-agent'] || '';
      const deviceFingerprint = createDeviceFingerprint(userAgent, clientIP, req.headers['accept-language'] as string);

      console.log(`[AUTH] Trying device authentication for fingerprint ${deviceFingerprint.substring(0, 8)}... from ${clientIP}`);

      // Check if this device has a valid session
      const deviceSession = await storage.getDeviceSessionByFingerprint(deviceFingerprint, clientIP);

      if (deviceSession && deviceSession.isActive) {
        console.log(`[AUTH] Found active device session for user ${deviceSession.userId}`);
        // Restore session for this device
        if (req.session) {
          (req.session as any).userId = deviceSession.userId;
          (req.session as any).tokenId = deviceSession.tokenId;
        }

        const user = await storage.getUser(deviceSession.userId);
        if (user) {
          console.log(`[AUTH] Successfully restored session for user ${user.name} (${user.id})`);
          // Update last access time
          await storage.updateDeviceSessionAccess(deviceSession.id);
          return user;
        }
      } else {
        console.log(`[AUTH] No active device session found for fingerprint ${deviceFingerprint.substring(0, 8)}... from ${clientIP}`);
      }
      return null;
    };

    // If no session userId, check for device-based authentication
    if (!userId) {
      const user = await tryDeviceAuthentication();
      if (user) {
        return res.json({ user });
      }
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Try to get user by session userId
    let user = await storage.getUser(userId);

    // If user not found but we have a session userId, try device authentication as fallback
    if (!user) {
      user = await tryDeviceAuthentication();
      if (user) {
        return res.json({ user });
      }
      return res.status(401).json({ message: "User not found" });
    }

    res.json({ user });
  });

  // Token-based authentication routes
  app.post("/api/auth/generate-token", rateLimitTokenGeneration, async (req, res) => {
    try {
      const { email } = req.body;

      // Validate email
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ message: "Valid email is required" });
      }

      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());

      // Check if user exists with this email
      let user = await storage.getUserByWhatsApp(sanitizedEmail); // For now, using whatsapp field

      // Generate access token
      const { token, tokenId } = await storage.createAccessToken(sanitizedEmail, user?.id);

      // Create the access URL
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const tokenUrl = `${baseUrl}/access?token=${token}`;

      // Send token link via email
      const emailSent = await emailService.sendTokenLink(sanitizedEmail, tokenUrl);

      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send access link email" });
      }

      res.json({
        success: true,
        message: "Access link sent to your email",
        tokenId // For development/testing purposes
      });
    } catch (error: any) {
      console.error("Token generation error:", error);
      res.status(500).json({ message: "Failed to generate access token" });
    }
  });

  // Get all access tokens (admin only)
  app.get("/api/auth/access-tokens", requireAdmin, async (req, res) => {
    try {
      const tokens = await storage.getAllAccessTokens();
      res.json({ tokens });
    } catch (error: any) {
      console.error("Get access tokens error:", error);
      res.status(500).json({ message: "Failed to get access tokens" });
    }
  });

  // Resend access token email (admin only)
  app.post("/api/auth/resend-token", requireAdmin, async (req, res) => {
    try {
      const { tokenId } = req.body;

      if (!tokenId) {
        return res.status(400).json({ message: "Token ID is required" });
      }

      // Get the access token
      const accessToken = await storage.getAccessTokenById(tokenId);
      if (!accessToken) {
        return res.status(404).json({ message: "Access token not found" });
      }

      // Create the access URL
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const tokenUrl = `${baseUrl}/access?token=${accessToken.token}`;

      // Send token link via email
      const emailSent = await emailService.sendTokenLink(accessToken.email, tokenUrl);

      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send access link email" });
      }

      res.json({
        success: true,
        message: "Access link resent successfully",
        tokenUrl
      });
    } catch (error: any) {
      console.error("Resend token error:", error);
      res.status(500).json({ message: "Failed to resend access token" });
    }
  });

  app.get("/api/auth/validate-token", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      // Get token from database
      const accessToken = await storage.getAccessToken(token as string);

      if (!accessToken) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      // Check if token is already used and bound to a different IP
      if (accessToken.isUsed && accessToken.ipAddress) {
        // Token is already bound to an IP - check if it's the same IP
        const clientIP = getClientIP(req);
        if (accessToken.ipAddress !== clientIP) {
          return res.status(403).json({
            message: "Access denied. This link can only be used from the original device and location."
          });
        }
      }

      // Tokens never expire - remove expiration check

      // Get client information
      const clientIP = getClientIP(req);
      const userAgent = req.headers['user-agent'] || '';
      const deviceFingerprint = createDeviceFingerprint(userAgent, clientIP, req.headers['accept-language'] as string);

      // Check if this is the first use of the token
      if (!accessToken.ipAddress) {
        // First time use - bind to this device/IP permanently
        await storage.markTokenAsUsed(accessToken.id, clientIP, deviceFingerprint);

        // Create device session if user exists
        if (accessToken.userId) {
          await storage.createDeviceSession(
            accessToken.userId,
            accessToken.id,
            clientIP,
            deviceFingerprint,
            userAgent
          );
        }

        // Check if user exists and has completed profile
        let user = null;
        let requiresProfileCompletion = true;

        if (accessToken.userId) {
          user = await storage.getUser(accessToken.userId);
          // User exists and has completed profile if profileCompleted is true
          requiresProfileCompletion = !user || !user.profileCompleted;
        } else {
          // No user associated with token - check if user exists by email
          user = await storage.getUserByEmail ? await storage.getUserByEmail(accessToken.email) : null;
          if (user) {
            // Link the token to the existing user
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
        // Token already bound to IP - allow access from same IP without OTP
        // Valid returning user - check if they have an active session
        if (accessToken.userId) {
          const deviceSession = await storage.getDeviceSession(accessToken.userId, accessToken.id);
          if (deviceSession) {
            await storage.updateDeviceSessionAccess(deviceSession.id);
          }

          // Get user to check profile completion status
          const user = await storage.getUser(accessToken.userId);
          const requiresProfileCompletion = !user || !user.profileCompleted;

          // If user has completed profile, establish session immediately
          if (!requiresProfileCompletion && user && req.session) {
            (req.session as any).userId = user.id;
            (req.session as any).tokenId = accessToken.id;
            
            // Save the session explicitly to ensure it's stored before responding
            return req.session.save(err => {
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
    } catch (error: any) {
      console.error("Token validation error:", error);
      res.status(500).json({ message: "Failed to validate token" });
    }
  });



  // Update user information after OTP verification
  app.post("/api/auth/update-user-info", async (req, res) => {
    try {
      const { name, whatsappNumber, city, email, tokenId } = req.body;

      if (!name || !whatsappNumber || !city || !email || !tokenId) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Sanitize inputs
      const sanitizedName = sanitizeInput(name.trim());
      const sanitizedWhatsapp = sanitizeInput(whatsappNumber.trim());
      const sanitizedCity = sanitizeInput(city.trim());
      const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());

      // Get user by email or create if doesn't exist
      let user = await storage.getUserByEmail ? await storage.getUserByEmail(sanitizedEmail) : null;

      if (!user) {
        // Try to find by whatsapp field (legacy)
        user = await storage.getUserByWhatsApp(sanitizedEmail);
      }

      if (!user) {
        // Create new user
        user = await storage.createUser({
          name: sanitizedName,
          whatsappNumber: sanitizedWhatsapp,
          email: sanitizedEmail,
          city: sanitizedCity,
          profileCompleted: true
        });

        // Link the token to the newly created user
        await storage.linkTokenToUser(parseInt(tokenId), user.id);
      } else {
        // Update existing user information
        user = await storage.updateUser(user.id, {
          name: sanitizedName,
          whatsappNumber: sanitizedWhatsapp,
          city: sanitizedCity,
          email: sanitizedEmail, // Now store the email in the proper field
          profileCompleted: true // Mark profile as completed
        });
      }

      // Create device session for persistent access
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
            req.headers['user-agent']
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

      // Set session
      if (req.session) {
        (req.session as any).userId = user.id;
        (req.session as any).tokenId = tokenId;
        
        // Save the session explicitly to ensure it's stored before responding
        req.session.save(err => {
          if (err) {
            console.error("Error saving session:", err);
          }
          
          // Return the user with the session cookie set
          res.json({
            success: true,
            user,
            message: "User information updated successfully"
          });
        });
      } else {
        // If no session object is available, still return success
        res.json({
          success: true,
          user,
          message: "User information updated successfully, but session could not be established"
        });
      }
    } catch (error: any) {
      console.error("Update user info error:", error);
      res.status(500).json({ message: "Failed to update user information" });
    }
  });

  // Product routes
  app.get("/api/products", requireTokenAuth, async (req, res) => {
    try {
      const { search, category, finish, material, sortBy, page = "1", limit = "50" } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      let products;
      let total = 0;

      if (search) {
        products = await storage.searchProducts(search as string, limitNum, offset);
        total = await storage.getSearchCount(search as string);
      } else {
        products = await storage.filterProducts({
          category: category === "all" ? undefined : category as string,
          finish: finish === "all" ? undefined : finish as string,
          material: material === "all" ? undefined : material as string,
          sortBy: sortBy as string,
          limit: limitNum,
          offset: offset,
        });
        total = await storage.getFilterCount({
          category: category === "all" ? undefined : category as string,
          finish: finish === "all" ? undefined : finish as string,
          material: material === "all" ? undefined : material as string,
        });
      }

      res.json({
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
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
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
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
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
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
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Excel upload route
  app.post("/api/products/upload-excel", upload.single('excel'), async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
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
      let products = [];

      // Log file info for debugging
      console.log(`Processing file: ${req.file.originalname}, size: ${req.file.size}, type: ${fileExtension}`);

      if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        // Process Excel file
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        console.log(`Excel data rows: ${data.length}, Sample row:`, data.length > 0 ? data[0] : "No data");

        products = data.map((row: any) => ({
          name: row.name || row.Name || '',
          code: row.code || row.Code || '',
          category: row.category || row.Category || '',
          length: parseFloat(row.length || row.Length || '0'),
          breadth: parseFloat(row.breadth || row.Breadth || '0'),
          height: parseFloat(row.height || row.Height || '0'),
          finish: row.finish || row.Finish || '',
          material: row.material || row.Material || '',
          imageUrl: row.imageUrl || row.ImageUrl || row.image_url || '',
        }));
      } else if (fileExtension === '.csv') {
        // Process CSV file
        const data: any[] = [];

        await new Promise((resolve, reject) => {
          fs.createReadStream(req.file!.path)
            .pipe(csvParser())
            .on('data', (row) => {
              // Log sample rows for debugging
              if (data.length < 2) {
                console.log("CSV row sample:", row);
              }
              data.push(row);
            })
            .on('end', resolve)
            .on('error', reject);
        });

        console.log(`CSV data rows: ${data.length}`);

        // Clean BOM characters and normalize keys
        const cleanedData = data.map((row: any) => {
          const cleanedRow: any = {};
          Object.keys(row).forEach(key => {
            // Remove BOM character (\uFEFF) and normalize key
            const cleanKey = key.replace(/^\uFEFF/, '').trim().toLowerCase();
            cleanedRow[cleanKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
          });
          return cleanedRow;
        });

        console.log("Cleaned CSV row sample:", cleanedData[0]);

        // Find all possible keys that could be name or code
        const nameKeys = ['name', 'product_name', 'productname', 'product name'];
        const codeKeys = ['code', 'product_code', 'productcode', 'product code', 'sku'];

        products = cleanedData.map((row: any) => {
          // Try to find name and code in different possible formats
          let name = '';
          let code = '';

          for (const key of nameKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              name = row[key];
              break;
            }
          }

          for (const key of codeKeys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              code = row[key];
              break;
            }
          }

          // Check all row keys if we still haven't found name or code
          if (!name || !code) {
            for (const key in row) {
              const value = row[key];
              if (!value) continue;

              // If key contains 'name' and we haven't found a name yet
              if (!name && key.toLowerCase().includes('name')) {
                name = value;
              }

              // If key contains 'code' or 'sku' and we haven't found a code yet
              if (!code && (key.toLowerCase().includes('code') || key.toLowerCase().includes('sku'))) {
                code = value;
              }
            }
          }

          return {
            name,
            code,
            category: row.category || '',
            length: parseFloat(row.length || '0'),
            breadth: parseFloat(row.breadth || '0'),
            height: parseFloat(row.height || '0'),
            finish: row.finish || '',
            material: row.material || '',
            imageUrl: row.imageurl || row.image_url || '',
          };
        });
      } else {
        return res.status(400).json({ message: "Unsupported file format. Please upload XLSX, XLS, or CSV file." });
      }

      const validProducts = products.filter(p => p.name && p.code);

      console.log(`Total products: ${products.length}, Valid products: ${validProducts.length}`);

      if (products.length > 0 && validProducts.length === 0) {
        console.log("Sample invalid product:", products[0]);
      }

      const createdProducts = await storage.bulkCreateProducts(validProducts);

      res.json({
        success: true,
        imported: createdProducts.length,
        total: products.length
      });
    } catch (error: any) {
      console.error("Excel upload error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Only Excel export for wishlist
  app.get("/api/wishlist/export/excel", async (req, res) => {
    try {
      // Allow admin to export a specific user's wishlist
      const requestedUserId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const adminId = (req.session as any)?.userId;

      let userId: number;

      // If admin is requesting another user's wishlist
      if (requestedUserId && adminId) {
        const admin = await storage.getUser(adminId);
        if (!admin?.isAdmin) {
          return res.status(403).json({ message: "Admin access required to export other users' wishlists" });
        }
        userId = requestedUserId;
      } else {
        // Regular user exporting their own wishlist
        userId = (req.session as any)?.userId;
        if (!userId) {
          return res.status(401).json({ message: "Not authenticated" });
        }
      }

      const wishlistItems = await storage.getWishlistByUser(userId);
      const user = await storage.getUser(userId);

      if (!wishlistItems.length) {
        return res.status(404).json({ message: "No items in wishlist" });
      }

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();

      // Format data for Excel (without image URLs)
      const data = wishlistItems.map((item, index) => ({
        "No.": index + 1,
        "Code": item.product.code,
        "Name": item.product.name,
        "Category": item.product.category,
        "Material": item.product.material || "Not specified",
        "Dimensions (cm)": `${item.product.length}×${item.product.breadth}×${item.product.height}`,
        "Finish": item.product.finish
      }));

      // Add header rows (This creates title rows before the actual data)
      const header = [
        ["Vmake Finessee - Customer Wishlist"],
        [`Customer: ${user?.name}`],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        [""], // Empty row for spacing
        [] // Empty row before the actual headers
      ];

      // Create worksheet with header
      const ws = XLSX.utils.aoa_to_sheet(header);

      // Add styling for header (merge cells for title)
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }); // Merge first row
      ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }); // Merge second row
      ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }); // Merge third row

      // Add the data to the worksheet starting from row 5
      XLSX.utils.sheet_add_json(ws, data, { origin: 5 });

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, ws, "Wishlist");

      // Generate Excel file
      const filename = `Vmake_Finessee_Wishlist_${user?.name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
      const filePath = path.join('uploads', filename);

      XLSX.writeFile(workbook, filePath);

      // Send file to client
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Error sending file:", err);
        }

        // Delete file after sending
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting file:", unlinkErr);
          }
        });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User management endpoints
  app.get("/api/users", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();

      // Remove password field for security
      const sanitizedUsers = users.map(user => {
        const { password, ...rest } = user as any;
        return rest;
      });

      res.json(sanitizedUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get user details with wishlist for admin
  app.get("/api/admin/users/:userId", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
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

      // Get user's wishlist
      const wishlist = await storage.getWishlistByUser(userId);

      // Remove password field for security
      const { password, ...sanitizedUser } = user as any;

      res.json({
        user: sanitizedUser,
        wishlist: wishlist
      });
    } catch (error: any) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { name, whatsappNumber, email, password, isAdmin } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByWhatsApp(whatsappNumber);
      if (existingUser) {
        return res.status(400).json({ message: "User with this WhatsApp number already exists" });
      }

      // Create new user
      const user = await storage.createUser({ name, whatsappNumber });

      // Set email, password and admin status if provided
      if (email || password || isAdmin) {
        const updates: Partial<User> = {};

        if (email) {
          updates.email = email;
        }

        if (password) {
          updates.password = await hashPassword(password);
        }

        if (isAdmin) {
          updates.isAdmin = true;

          // Only primary admin can create another admin
          if (admin.isPrimaryAdmin) {
            updates.isPrimaryAdmin = false; // Secondary admin
          } else {
            // Non-primary admin can't create admins
            updates.isAdmin = false;
          }
        }

        await storage.updateUser(user.id, updates);
      }

      const updatedUser = await storage.getUser(user.id);

      // Remove password field for security
      const { password: _, ...sanitizedUser } = updatedUser as any;

      res.json(sanitizedUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userId = parseInt(req.params.id);
      const { name, whatsappNumber, email, password, isAdmin, isPrimaryAdmin } = req.body;

      // Get user to update
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent modifying primary admin unless you are primary admin
      if (user.isPrimaryAdmin && !admin.isPrimaryAdmin) {
        return res.status(403).json({ message: "Only primary admin can modify another primary admin" });
      }

      // Create update object
      const updates: Partial<User> = {};

      if (name) updates.name = name;
      if (whatsappNumber) updates.whatsappNumber = whatsappNumber;
      if (email !== undefined) updates.email = email; // Allow setting email to empty string
      if (password) updates.password = await hashPassword(password);

      // Admin privileges - only primary admin can set these
      if (admin.isPrimaryAdmin) {
        if (isAdmin !== undefined) updates.isAdmin = isAdmin;
        if (isPrimaryAdmin !== undefined) updates.isPrimaryAdmin = isPrimaryAdmin;
      }

      const updatedUser = await storage.updateUser(userId, updates);

      // Remove password field for security
      const { password: _, ...sanitizedUser } = updatedUser as any;

      res.json(sanitizedUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userId = parseInt(req.params.id);

      // Get user to delete
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent deleting primary admin
      if (user.isPrimaryAdmin) {
        return res.status(403).json({ message: "Cannot delete primary admin" });
      }

      // Prevent admin from deleting themselves
      if (userId === adminId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const success = await storage.deleteUser(userId);

      if (!success) {
        return res.status(500).json({ message: "Failed to delete user" });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export user data endpoint
  app.get("/api/users/export", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();

      // Format data for Excel (excluding sensitive information)
      const data = users.map((user, index) => ({
        "No.": index + 1,
        "Name": user.name,
        "WhatsApp Number": user.whatsappNumber,
        "Email": user.email || "Not provided",
        "Admin": user.isAdmin ? "Yes" : "No",
        "Primary Admin": user.isPrimaryAdmin ? "Yes" : "No",
        "Registered On": new Date(user.createdAt!).toLocaleDateString()
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, ws, "Users");

      // Generate Excel file
      const filename = `Vmake_Finessee_Users_${Date.now()}.xlsx`;
      const filePath = path.join('uploads', filename);

      XLSX.writeFile(workbook, filePath);

      // Send file to client
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Error sending file:", err);
        }

        // Delete file after sending
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error("Error deleting file:", unlinkErr);
          }
        });
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mock feedback data for development
  let mockFeedback: Feedback[] = [
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
      createdAt: new Date("2024-05-15"),
      updatedAt: new Date("2024-05-15"),
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
      createdAt: new Date("2024-05-20"),
      updatedAt: new Date("2024-05-20"),
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
      createdAt: new Date("2024-05-25"),
      updatedAt: new Date("2024-05-25"),
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
      createdAt: new Date("2024-05-28"),
      updatedAt: new Date("2024-05-28"),
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
      createdAt: new Date("2024-05-30"),
      updatedAt: new Date("2024-05-30"),
    },
  ];

  // Feedback routes
  app.get("/api/feedback", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // For development, return mock data
      res.json(mockFeedback);
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/feedback/published", async (_req, res) => {
    try {
      // For development, return published mock data
      const publishedFeedback = mockFeedback.filter(f => f.isPublished);
      res.json(publishedFeedback);
    } catch (error: any) {
      console.error("Error fetching published feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/feedback", async (req, res) => {
    try {
      const feedbackData = insertFeedbackSchema.parse(req.body);

      // For development, add to mock data
      const newFeedback: Feedback = {
        ...feedbackData,
        id: mockFeedback.length + 1,
        productId: feedbackData.productId || null,
        customerPhone: feedbackData.customerPhone || null,
        adminNotes: null,
        isApproved: false,
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockFeedback.push(newFeedback);

      res.status(201).json(newFeedback);
    } catch (error: any) {
      console.error("Error creating feedback:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/feedback/:id", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const feedbackId = parseInt(req.params.id);
      const updates = req.body;

      // For development, update mock data
      const index = mockFeedback.findIndex(f => f.id === feedbackId);
      if (index === -1) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      mockFeedback[index] = {
        ...mockFeedback[index],
        ...updates,
        updatedAt: new Date(),
      };

      res.json(mockFeedback[index]);
    } catch (error: any) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/feedback/:id", async (req, res) => {
    try {
      const adminId = (req.session as any)?.userId;
      if (!adminId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const admin = await storage.getUser(adminId);
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const feedbackId = parseInt(req.params.id);

      // For development, remove from mock data
      const index = mockFeedback.findIndex(f => f.id === feedbackId);
      if (index === -1) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      mockFeedback.splice(index, 1);
      res.json({ message: "Feedback deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
