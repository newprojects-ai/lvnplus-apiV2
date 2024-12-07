import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { RegisterUserDTO, LoginUserDTO, AuthResponse } from '../types';
import { UnauthorizedError, ValidationError } from '../utils/errors';

export class AuthService {
  async register(data: RegisterUserDTO): Promise<AuthResponse> {
    const existingUser = await prisma.users.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Default role if none provided
    const roles = data.roles?.length ? data.roles : ['STUDENT'];

    const user = await prisma.users.create({
      data: {
        email: data.email,
        password_hash: hashedPassword,
        first_name: data.firstName,
        last_name: data.lastName,
        user_roles: {
          create: roles.map(role => ({
            roles: {
              connect: {
                role_name: role,
              },
            },
          })),
        },
      },
      include: {
        user_roles: {
          include: {
            roles: true,
          },
        },
      },
    });

    const token = this.generateToken(user);

    return {
      user: this.formatUserResponse(user),
      token,
    };
  }

  async login(credentials: LoginUserDTO): Promise<AuthResponse> {
    try {
      const user = await prisma.users.findUnique({
        where: { email: credentials.email },
        include: {
          user_roles: {
            include: {
              roles: true,
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      if (!user.active) {
        throw new UnauthorizedError('Account is inactive');
      }

      const isValidPassword = await bcrypt.compare(
        credentials.password,
        user.password_hash
      );

      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const token = this.generateToken(user);

      return {
        user: this.formatUserResponse(user),
        token,
      };
    } catch (error) {
      console.error('Login error:', {
        email: credentials.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private generateToken(user: any): string {
    const roles = user.user_roles.map((ur: any) => ur.roles.role_name);
    
    try {
      return jwt.sign(
        {
          userId: user.user_id.toString(),
          email: user.email,
          roles,
        },
        process.env.JWT_SECRET!,
        { 
          expiresIn: '24h',
          algorithm: 'HS256'
        }
      );
    } catch (error) {
      console.error('Error generating token:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  private formatUserResponse(user: any) {
    return {
      id: user.user_id.toString(),
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: user.user_roles.map((ur: any) => ur.roles.role_name),
    };
  }
}