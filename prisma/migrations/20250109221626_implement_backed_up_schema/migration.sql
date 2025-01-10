-- CreateTable
CREATE TABLE `student_progress` (
    `user_id` BIGINT NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `current_xp` INTEGER NOT NULL DEFAULT 0,
    `next_level_xp` INTEGER NOT NULL DEFAULT 1000,
    `streak_days` INTEGER NOT NULL DEFAULT 0,
    `last_activity_date` TIMESTAMP(0) NULL,
    `total_points` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `student_progress_user_id_idx`(`user_id`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `achievements` (
    `achievement_id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `points` INTEGER NOT NULL,
    `icon` VARCHAR(100) NULL,
    `required_criteria` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `achievements_category_idx`(`category`),
    PRIMARY KEY (`achievement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_achievements` (
    `user_id` BIGINT NOT NULL,
    `achievement_id` BIGINT NOT NULL,
    `unlocked_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `progress` INTEGER NOT NULL DEFAULT 0,

    INDEX `student_achievements_user_id_idx`(`user_id`),
    PRIMARY KEY (`user_id`, `achievement_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rewards` (
    `reward_id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `cost` INTEGER NOT NULL,
    `icon` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `rewards_category_idx`(`category`),
    PRIMARY KEY (`reward_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_rewards` (
    `user_id` BIGINT NOT NULL,
    `reward_id` BIGINT NOT NULL,
    `purchased_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `student_rewards_user_id_idx`(`user_id`),
    PRIMARY KEY (`user_id`, `reward_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subject_mastery` (
    `user_id` BIGINT NOT NULL,
    `subject_id` INTEGER NOT NULL,
    `mastery_level` INTEGER NOT NULL DEFAULT 0,
    `total_questions_attempted` INTEGER NOT NULL DEFAULT 0,
    `correct_answers` INTEGER NOT NULL DEFAULT 0,
    `last_test_date` TIMESTAMP(0) NULL,

    INDEX `subject_mastery_user_id_idx`(`user_id`),
    PRIMARY KEY (`user_id`, `subject_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_log` (
    `activity_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `activity_type` VARCHAR(50) NOT NULL,
    `xp_earned` INTEGER NOT NULL DEFAULT 0,
    `details` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `activity_log_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`activity_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `level_config` (
    `level` INTEGER NOT NULL,
    `xp_required` INTEGER NOT NULL,
    `perks` TEXT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`level`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_progress` ADD CONSTRAINT `student_progress_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_achievements` ADD CONSTRAINT `student_achievements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_achievements` ADD CONSTRAINT `student_achievements_achievement_id_fkey` FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`achievement_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_rewards` ADD CONSTRAINT `student_rewards_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_rewards` ADD CONSTRAINT `student_rewards_reward_id_fkey` FOREIGN KEY (`reward_id`) REFERENCES `rewards`(`reward_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subject_mastery` ADD CONSTRAINT `subject_mastery_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subject_mastery` ADD CONSTRAINT `subject_mastery_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`subject_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_log` ADD CONSTRAINT `activity_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `idx_test_executions_student` ON `test_executions`(`student_id`);
DROP INDEX `student_id` ON `test_executions`;
