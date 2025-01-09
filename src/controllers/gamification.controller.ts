import { Request, Response, NextFunction } from 'express';
import { GamificationService } from '../services/gamification.service';

const gamificationService = new GamificationService();

export const getProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const progress = await gamificationService.getProgress(userId);
    res.json(progress);
  } catch (error) {
    next(error);
  }
};

export const addXP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { amount, source } = req.body;
    const result = await gamificationService.addXP(userId, amount, source);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateStreak = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const result = await gamificationService.updateStreak(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getAchievements = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const achievements = await gamificationService.getAchievements(userId);
    res.json(achievements);
  } catch (error) {
    next(error);
  }
};

export const unlockAchievement = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { achievementId } = req.params;
    const result = await gamificationService.unlockAchievement(userId, achievementId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getAchievementProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const progress = await gamificationService.getAchievementProgress(userId);
    res.json(progress);
  } catch (error) {
    next(error);
  }
};

export const getAvailableRewards = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const rewards = await gamificationService.getAvailableRewards(userId);
    res.json(rewards);
  } catch (error) {
    next(error);
  }
};

export const purchaseReward = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { rewardId } = req.params;
    const result = await gamificationService.purchaseReward(userId, rewardId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getLevelInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const levelInfo = await gamificationService.getLevelInfo(userId);
    res.json(levelInfo);
  } catch (error) {
    next(error);
  }
};

export const levelUpNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const result = await gamificationService.levelUpNotification(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};