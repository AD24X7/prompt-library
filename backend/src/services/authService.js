const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../database');

class AuthService {
  // Generate JWT token
  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        name: user.name 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  // Verify JWT token
  verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  // Hash password
  async hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  // Compare password
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Generate verification code
  generateVerificationCode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  // Create user (email/password)
  async createUser(email, password, name) {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const hashedPassword = await this.hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        provider: 'email'
      }
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider,
      verified: user.verified
    };
  }

  // Authenticate user (email/password)
  async authenticateUser(email, password) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.password) {
      throw new Error('Invalid credentials');
    }

    const isValid = await this.comparePassword(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider,
      verified: user.verified
    };
  }

  // Find or create OAuth user
  async findOrCreateOAuthUser(profile, provider) {
    let user = await prisma.user.findUnique({
      where: { email: profile.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
          provider,
          verified: true // OAuth users are pre-verified
        }
      });
    } else if (user.provider !== provider) {
      // Update provider if user signed up with email but now using OAuth
      user = await prisma.user.update({
        where: { id: user.id },
        data: { provider, verified: true }
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider,
      verified: user.verified
    };
  }

  // Send verification code (mock implementation)
  async sendVerificationCode(email) {
    const code = this.generateVerificationCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: 'Temporary User',
        verificationCode: code,
        verificationExpiry: expiry,
        provider: 'email'
      },
      update: {
        verificationCode: code,
        verificationExpiry: expiry
      }
    });

    // In production, send actual email here
    console.log(`🔐 Verification code for ${email}: ${code}`);
    
    return { success: true, message: 'Verification code sent' };
  }

  // Verify code and authenticate
  async verifyCode(email, code) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.verificationCode || !user.verificationExpiry) {
      throw new Error('Invalid verification request');
    }

    if (new Date() > user.verificationExpiry) {
      throw new Error('Verification code expired');
    }

    if (user.verificationCode !== code.toUpperCase()) {
      throw new Error('Invalid verification code');
    }

    // Clear verification data and mark as verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        verificationCode: null,
        verificationExpiry: null
      }
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatar: updatedUser.avatar,
      provider: updatedUser.provider,
      verified: updatedUser.verified
    };
  }

  // Get user by ID
  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider,
      verified: user.verified
    };
  }
}

module.exports = new AuthService();