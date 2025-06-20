import crypto from 'crypto';

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a unique access token
 */
export function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a device fingerprint from request headers and IP
 */
export function createDeviceFingerprint(userAgent: string, ip: string, acceptLanguage?: string): string {
  const data = `${userAgent}|${ip}|${acceptLanguage || ''}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get client IP address from request
 */
export function getClientIP(req: any): string {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         '127.0.0.1';
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if token has expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Check if OTP has expired (10 minutes)
 */
export function isOTPExpired(createdAt: Date): boolean {
  const expirationTime = 10 * 60 * 1000; // 10 minutes in milliseconds
  return Date.now() - new Date(createdAt).getTime() > expirationTime;
}

/**
 * Generate a secure random string for tokens
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data for storage
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create a rate limiting key for IP-based restrictions
 */
export function createRateLimitKey(ip: string, action: string): string {
  return `rate_limit:${action}:${ip}`;
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return input.replace(/[<>\"'%;()&+]/g, '');
}

/**
 * Check if IP address is in a valid format
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Create a session token for authenticated users
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * Validate device fingerprint format
 */
export function isValidDeviceFingerprint(fingerprint: string): boolean {
  // Should be a 64-character hex string (SHA-256 hash)
  return /^[a-f0-9]{64}$/i.test(fingerprint);
}

/**
 * Create audit log entry
 */
export function createAuditLogEntry(action: string, userId: number, ip: string, details?: any) {
  return {
    timestamp: new Date().toISOString(),
    action,
    userId,
    ip,
    details: details || {},
    userAgent: details?.userAgent || 'unknown'
  };
}

/**
 * Check if user agent looks suspicious
 */
export function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /postman/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Generate a time-based one-time password (TOTP) style code
 */
export function generateTOTP(secret: string, timeStep: number = 30): string {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(Buffer.from(time.toString(16).padStart(16, '0'), 'hex'));
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24) |
               ((hash[offset + 1] & 0xff) << 16) |
               ((hash[offset + 2] & 0xff) << 8) |
               (hash[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
}
