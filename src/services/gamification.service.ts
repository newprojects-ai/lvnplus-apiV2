import prisma from '../lib/prisma';
import { NotFoundError, ValidationError } from '../utils/errors';

export class GamificationService {
  async getProgress(userId: bigint) {
    const progress = await prisma.student_progress.findUnique({
      where: { user_id: userId },
      include: {
        subject_mastery: {
          select: {
            subject_id: true,
            mastery_level: true
          }
        }
      }
    });

    if (!progress) {
      throw new NotFoundError('Student progress not found');
    }

    const subjectMastery = progress.subject_mastery.reduce((acc, curr) => {
      acc[curr.subject_id] = curr.mastery_level;
      return acc;
    }, {} as Record<string, number>);

    return {
      userId: progress.user_id.toString(),
      level: progress.level,
      currentXP: progress.current_xp,
      nextLevelXP: progress.next_level_xp,
      streakDays: progress.streak_days,
      lastActivityDate: progress.last_activity_date,
      totalPoints: progress.total_points,
      subjectMastery
    };
  }

  async addXP(userId: bigint, amount: number, source: string) {
    if (amount <= 0) {
      throw new ValidationError('XP amount must be positive');
    }

    const progress = await prisma.student_progress.findUnique({
      where: { user_id: userId }
    });

    if (!progress) {
      throw new NotFoundError('Student progress not found');
    }

    const newXP = progress.current_xp + amount;
    let leveledUp = false;
    let newLevel = progress.level;

    // Check if level up is needed
    if (newXP >= progress.next_level_xp) {
      leveledUp = true;
      newLevel++;
      
      // Get next level XP requirement
      const nextLevel = await prisma.level_config.findUnique({
        where: { level: newLevel }
      });

      if (!nextLevel) {
        throw new ValidationError('Level configuration not found');
      }

      // Update progress with new level info
      await prisma.student_progress.update({
        where: { user_id: userId },
        data: {
          level: newLevel,
          current_xp: newXP,
          next_level_xp: nextLevel.xp_required
        }
      });
    } else {
      // Just update XP
      await prisma.student_progress.update({
        where: { user_id: userId },
        data: {
          current_xp: newXP
        }
      });
    }

    // Log activity
    await prisma.activity_log.create({
      data: {
        user_id: userId,
        activity_type: 'XP_GAIN',
        xp_earned: amount,
        details: JSON.stringify({ source })
      }
    });

    return {
      newXP,
      totalXP: newXP,
      level: newLevel,
      leveledUp
    };
  }

  async updateStreak(userId: bigint) {
    const progress = await prisma.student_progress.findUnique({
      where: { user_id: userId }
    });

    if (!progress) {
      throw new NotFoundError('Student progress not found');
    }

    const lastActivity = progress.last_activity_date;
    const now = new Date();
    const streakBonus = 0;

    // Check if streak should be updated
    if (!lastActivity || this.isNextDay(lastActivity, now)) {
      const newStreak = progress.streak_days + 1;
      
      await prisma.student_progress.update({
        where: { user_id: userId },
        data: {
          streak_days: newStreak,
          last_activity_date: now
        }
      });

      return {
        streakDays: newStreak,
        streakBonus
      };
    }

    return {
      streakDays: progress.streak_days,
      streakBonus
    };
  }

  private isNextDay(lastActivity: Date, now: Date): boolean {
    const lastDate = new Date(lastActivity);
    const today = new Date(now);
    
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 1;
  }

  async getAchievements(userId: bigint) {
    const achievements = await prisma.achievements.findMany({
      include: {
        student_achievements: {
          where: { user_id: userId }
        }
      }
    });

    return achievements.map(achievement => ({
      id: achievement.achievement_id.toString(),
      title: achievement.title,
      description: achievement.description,
      category: achievement.category,
      points: achievement.points,
      requiredCriteria: JSON.parse(achievement.required_criteria),
      unlockedAt: achievement.student_achievements[0]?.unlocked_at
    }));
  }

  async unlockAchievement(userId: bigint, achievementId: string) {
    const achievement = await prisma.achievements.findUnique({
      where: { achievement_id: BigInt(achievementId) }
    });

    if (!achievement) {
      throw new NotFoundError('Achievement not found');
    }

    // Check if already unlocked
    const existing = await prisma.student_achievements.findUnique({
      where: {
        user_id_achievement_id: {
          user_id: userId,
          achievement_id: BigInt(achievementId)
        }
      }
    });

    if (existing) {
      throw new ValidationError('Achievement already unlocked');
    }

    // Create achievement unlock record
    await prisma.student_achievements.create({
      data: {
        user_id: userId,
        achievement_id: BigInt(achievementId)
      }
    });

    // Award XP
    const xpAwarded = achievement.points;
    await this.addXP(userId, xpAwarded, 'achievement_unlock');

    return {
      achievement,
      xpAwarded
    };
  }

  async getAchievementProgress(userId: bigint) {
    const achievements = await prisma.student_achievements.findMany({
      where: { user_id: userId },
      include: {
        achievements: true
      }
    });

    return {
      achievements: achievements.map(a => ({
        id: a.achievement_id.toString(),
        progress: a.progress,
        target: JSON.parse(a.achievements.required_criteria).target
      }))
    };
  }

  async getAvailableRewards(userId: bigint) {
    const rewards = await prisma.rewards.findMany({
      include: {
        student_rewards: {
          where: { user_id: userId }
        }
      }
    });

    return rewards.map(reward => ({
      id: reward.reward_id.toString(),
      title: reward.title,
      description: reward.description,
      cost: reward.cost,
      category: reward.category,
      unlocked: reward.student_rewards.length > 0
    }));
  }

  async purchaseReward(userId: bigint, rewardId: string) {
    const reward = await prisma.rewards.findUnique({
      where: { reward_id: BigInt(rewardId) }
    });

    if (!reward) {
      throw new NotFoundError('Reward not found');
    }

    // Check if already purchased
    const existing = await prisma.student_rewards.findUnique({
      where: {
        user_id_reward_id: {
          user_id: userId,
          reward_id: BigInt(rewardId)
        }
      }
    });

    if (existing) {
      throw new ValidationError('Reward already purchased');
    }

    // Check if user has enough points
    const progress = await prisma.student_progress.findUnique({
      where: { user_id: userId }
    });

    if (!progress || progress.total_points < reward.cost) {
      throw new ValidationError('Insufficient points');
    }

    // Purchase reward
    await prisma.student_rewards.create({
      data: {
        user_id: userId,
        reward_id: BigInt(rewardId)
      }
    });

    // Deduct points
    const newBalance = progress.total_points - reward.cost;
    await prisma.student_progress.update({
      where: { user_id: userId },
      data: { total_points: newBalance }
    });

    return {
      success: true,
      newBalance,
      unlockedReward: reward
    };
  }

  async getLevelInfo(userId: bigint) {
    const progress = await prisma.student_progress.findUnique({
      where: { user_id: userId }
    });

    if (!progress) {
      throw new NotFoundError('Student progress not found');
    }

    const levelConfig = await prisma.level_config.findUnique({
      where: { level: progress.level }
    });

    if (!levelConfig) {
      throw new NotFoundError('Level configuration not found');
    }

    return {
      currentLevel: progress.level,
      xpProgress: progress.current_xp,
      xpRequired: progress.next_level_xp,
      availablePerks: levelConfig.perks ? JSON.parse(levelConfig.perks).unlocks : []
    };
  }

  async levelUpNotification(userId: bigint) {
    const progress = await prisma.student_progress.findUnique({
      where: { user_id: userId }
    });

    if (!progress) {
      throw new NotFoundError('Student progress not found');
    }

    const levelConfig = await prisma.level_config.findUnique({
      where: { level: progress.level }
    });

    if (!levelConfig) {
      throw new NotFoundError('Level configuration not found');
    }

    const perks = JSON.parse(levelConfig.perks);

    return {
      newLevel: progress.level,
      unlockedRewards: perks.unlocks,
      xpBonus: 0 // Implement XP bonus logic if needed
    };
  }
}