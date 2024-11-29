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

    const user = await prisma.users.create({
      data: {
        email: data.email,
        password_hash: hashedPassword,
        first_name: data.firstName,
        last_name: data.lastName,
        user_roles: {
          create: {
            roles: {
              connect: {
                role_name: 'STUDENT', // Default role
              },
            },
          },
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
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(
      credentials.password,
      user.password_hash
    );

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = this.generateToken(user);

    return {
      user: this.formatUserResponse(user),
      token,
    };
  }

  private generateToken(user: any): string {
    const roles = user.user_roles.map((ur: any) => ur.roles.role_name);
    
    return jwt.sign(
      {
        userId: user.user_id.toString(),
        email: user.email,
        roles,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
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