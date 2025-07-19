import { Request, Response } from 'express';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../../../config/database';
import logger from '../../../config/logger';
import { WalletService, WalletType, WalletConnectionData } from '../../../services/wallet.service';

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  full_name: Joi.string().min(2).max(100).optional(),
  username: Joi.string().alphanum().min(3).max(30).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const register = async (req: Request, res: Response) => {
  // 1. Validate request body
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email, password, full_name, username } = value;

  try {
    // 2. Check if user already exists
    const userExists = await getPool().query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    // 3. Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Insert the new user into the database
    const newUser = await getPool().query(
      'INSERT INTO users (email, password_hash, full_name, username) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, username, created_at',
      [email, passwordHash, full_name || null, username || null]
    );

    // 5. Generate JWT token for the new user
    const accessToken = jwt.sign({ userId: newUser.rows[0].id }, process.env.JWT_SECRET as string, {
      expiresIn: '15m',
    });
    const refreshToken = jwt.sign({ userId: newUser.rows[0].id }, process.env.JWT_REFRESH_SECRET as string, {
        expiresIn: '7d',
    });

    // 6. Send refresh token in secure cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // 7. Send success response with user data and access token
    logger.info(`New user registered: ${email}`);
    res.status(201).json({
      user: newUser.rows[0],
      token: accessToken
    });

  } catch (err) {
    logger.error('Error during user registration:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  // 1. Validate request body
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email, password } = value;

  try {
    // 2. Find the user by email
    const result = await getPool().query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 3. Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 4. Issue Tokens
    const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: '15m',
    });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET as string, {
        expiresIn: '7d',
    });

    // 5. Send refresh token in secure cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // 6. Send the access token to the client
    res.json({ accessToken });

  } catch (err) {
    logger.error('Error during user login:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Database schema requirement: 
// The 'users' table must have a nullable, unique 'wallet_address' TEXT column.
// The 'email' and 'password_hash' columns should also be nullable.



export const connectWallet = async (req: Request, res: Response) => {
  try {
    // Wallet data should be validated by middleware
    if (!req.walletData || !req.walletData.isVerified) {
      return res.status(401).json({ 
        error: 'Wallet signature verification required',
        message: 'Please verify your wallet signature first'
      });
    }

    const { address, walletType } = req.walletData;

    // Check if user already exists
    let user = await getPool().query(
      'SELECT * FROM users WHERE wallet_address = $1', 
      [address]
    );
    
    if (user.rows.length === 0) {
      // Create new user if doesn't exist
      user = await getPool().query(
        'INSERT INTO users (wallet_address, wallet_type, created_at) VALUES ($1, $2, NOW()) RETURNING id, wallet_address, wallet_type, created_at',
        [address, walletType]
      );
      
      logger.info('New user created via wallet connection', {
        userId: user.rows[0].id,
        walletAddress: address,
        walletType
      });
    } else {
      // Update wallet type if changed
      await getPool().query(
        'UPDATE users SET wallet_type = $1, last_login = NOW() WHERE wallet_address = $2',
        [walletType, address]
      );
    }

    const userData = user.rows[0];

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { 
        userId: userData.id,
        walletAddress: address,
        walletType 
      }, 
      process.env.JWT_SECRET as string, 
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { userId: userData.id }, 
      process.env.JWT_REFRESH_SECRET as string, 
      { expiresIn: '7d' }
    );

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return success response
    res.status(200).json({
      message: 'Wallet connected successfully',
      user: {
        id: userData.id,
        walletAddress: address,
        walletType,
        createdAt: userData.created_at
      },
      accessToken
    });

  } catch (error) {
    logger.error('Wallet connection failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      walletAddress: req.walletData?.address
    });
    
    res.status(500).json({ 
      error: 'Internal server error during wallet connection' 
    });
  }
};

export const verifyToken = (req: Request, res: Response) => {
  // If the protect middleware passes, the token is valid.
  res.status(200).json({ message: 'Token is valid' });
};

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token not found.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as { userId: string };

    // Optional: Check if user still exists in the database
    const userResult = await getPool().query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (userResult.rows.length === 0) {
        return res.status(401).json({ message: 'User not found.' });
    }

    const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET as string, {
      expiresIn: '15m',
    });

    res.json({ accessToken });
  } catch (error) {
    logger.error('Error refreshing token:', error);
    return res.status(403).json({ message: 'Invalid refresh token.' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logout successful' });
};

const updateProfileSchema = Joi.object({
  email: Joi.string().email().optional(),
  password: Joi.string().min(8).optional(),
  bio: Joi.string().allow('').optional(),
  avatarUrl: Joi.string().uri({ allowRelative: false }).allow('').optional(),
  website: Joi.string().uri({ allowRelative: false }).allow('').optional(),
  location: Joi.string().allow('').optional(),
  aptosAddress: Joi.string().length(66).pattern(/^0x[a-fA-F0-9]{64}$/).optional(),
}).min(1);

export const updateProfile = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const { error, value } = updateProfileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email, password, bio, avatarUrl, website, location, aptosAddress } = value;

  try {
    if (email) {
      const userExists = await getPool().query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (userExists.rows.length > 0) {
        return res.status(409).json({ message: 'Email is already in use.' });
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let queryIndex = 1;

    if (email) {
      updates.push(`email = $${queryIndex++}`);
      values.push(email);
    }

    if (password) {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      updates.push(`password_hash = $${queryIndex++}`);
      values.push(passwordHash);
    }

    if (bio !== undefined) {
      updates.push(`bio = $${queryIndex++}`);
      values.push(bio);
    }

    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${queryIndex++}`);
      values.push(avatarUrl);
    }

    if (website !== undefined) {
      updates.push(`website = $${queryIndex++}`);
      values.push(website);
    }

    if (location !== undefined) {
      updates.push(`location = $${queryIndex++}`);
      values.push(location);
    }

    if (aptosAddress) {
      updates.push(`aptos_address = $${queryIndex++}`);
      values.push(aptosAddress);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No update fields provided.' });
    }

    values.push(userId);
    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = $${queryIndex} RETURNING id, email, wallet_address, bio, avatar_url, website, location, created_at`;

    const result = await getPool().query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

        logger.info(`User profile updated for user ID: ${userId}`);
    return res.status(200).json({ message: 'Profile updated successfully.' });

  } catch (err) {
    logger.error(`Error updating profile for user ID ${userId}:`, err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteProfile = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  try {
    const deleteResult = await getPool().query('DELETE FROM users WHERE id = $1', [userId]);

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.cookie('refreshToken', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    logger.info(`User account deleted for user ID: ${userId}`);
    res.status(200).json({ message: 'Account deleted successfully.' });

  } catch (err) {
    logger.error(`Error deleting account for user ID ${userId}:`, err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  try {
    const result = await getPool().query(
      `SELECT 
        id, 
        email, 
        wallet_address AS "walletAddress", 
        bio, 
        avatar_url AS "avatarUrl", 
        website, 
        location, 
        reputation_score AS "reputationScore",
        created_at AS "createdAt"
      FROM users WHERE id = $1`,
      [req.user.userId]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    logger.error('Error fetching user profile:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
