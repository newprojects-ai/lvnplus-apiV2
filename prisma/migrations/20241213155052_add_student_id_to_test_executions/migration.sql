-- CreateTable
CREATE TABLE `exam_boards` (
    `board_id` INTEGER NOT NULL AUTO_INCREMENT,
    `board_name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `input_type` ENUM('NUMERIC', 'MCQ') NOT NULL,

    UNIQUE INDEX `board_name`(`board_name`),
    PRIMARY KEY (`board_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `questions` (
    `question_id` BIGINT NOT NULL AUTO_INCREMENT,
    `subtopic_id` INTEGER NOT NULL,
    `question_text` TEXT NOT NULL,
    `question_text_plain` TEXT NOT NULL,
    `options` LONGTEXT NOT NULL,
    `correct_answer` VARCHAR(255) NOT NULL,
    `correct_answer_plain` VARCHAR(255) NOT NULL,
    `solution` TEXT NOT NULL,
    `solution_plain` TEXT NOT NULL,
    `difficulty_level` TINYINT NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_by` BIGINT NOT NULL,
    `active` BOOLEAN NULL DEFAULT true,

    INDEX `created_by`(`created_by`),
    INDEX `idx_questions_difficulty`(`difficulty_level`),
    INDEX `subtopic_id`(`subtopic_id`),
    PRIMARY KEY (`question_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `role_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_name` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `role_name`(`role_name`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subjects` (
    `subject_id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `subject_name`(`subject_name`),
    PRIMARY KEY (`subject_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subtopics` (
    `subtopic_id` INTEGER NOT NULL AUTO_INCREMENT,
    `topic_id` INTEGER NOT NULL,
    `subtopic_name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `unique_subtopic`(`topic_id`, `subtopic_name`),
    PRIMARY KEY (`subtopic_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_executions` (
    `execution_id` BIGINT NOT NULL AUTO_INCREMENT,
    `test_plan_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED') NOT NULL,
    `started_at` TIMESTAMP(0) NULL,
    `completed_at` TIMESTAMP(0) NULL,
    `test_data` LONGTEXT NOT NULL,
    `score` INTEGER NULL,

    INDEX `idx_test_executions_status`(`status`),
    INDEX `test_plan_id`(`test_plan_id`),
    INDEX `idx_test_executions_student`(`student_id`),
    PRIMARY KEY (`execution_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_plans` (
    `test_plan_id` BIGINT NOT NULL AUTO_INCREMENT,
    `template_id` BIGINT NULL,
    `board_id` INTEGER NOT NULL,
    `test_type` ENUM('TOPIC', 'MIXED', 'MENTAL_ARITHMETIC') NOT NULL,
    `timing_type` ENUM('TIMED', 'UNTIMED') NOT NULL,
    `time_limit` INTEGER NULL,
    `student_id` BIGINT NOT NULL,
    `planned_by` BIGINT NOT NULL,
    `planned_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `configuration` LONGTEXT NOT NULL,

    INDEX `board_id`(`board_id`),
    INDEX `idx_test_plans_student`(`student_id`),
    INDEX `planned_by`(`planned_by`),
    INDEX `template_id`(`template_id`),
    PRIMARY KEY (`test_plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_templates` (
    `template_id` BIGINT NOT NULL AUTO_INCREMENT,
    `template_name` VARCHAR(255) NOT NULL,
    `source` ENUM('SYSTEM', 'USER') NOT NULL,
    `created_by` BIGINT NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `board_id` INTEGER NOT NULL,
    `test_type` ENUM('TOPIC', 'MIXED', 'MENTAL_ARITHMETIC') NOT NULL,
    `timing_type` ENUM('TIMED', 'UNTIMED') NOT NULL,
    `time_limit` INTEGER NULL,
    `configuration` LONGTEXT NOT NULL,
    `active` BOOLEAN NULL DEFAULT true,

    INDEX `board_id`(`board_id`),
    INDEX `created_by`(`created_by`),
    INDEX `idx_templates_source`(`source`),
    PRIMARY KEY (`template_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `topics` (
    `topic_id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject_id` INTEGER NOT NULL,
    `topic_name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `unique_topic`(`subject_id`, `topic_name`),
    PRIMARY KEY (`topic_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `user_id` BIGINT NOT NULL,
    `role_id` INTEGER NOT NULL,

    INDEX `role_id`(`role_id`),
    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `user_id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(100) NULL,
    `last_name` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `active` BOOLEAN NULL DEFAULT true,

    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `difficulty_levels` (
    `level_id` INTEGER NOT NULL AUTO_INCREMENT,
    `level_name` VARCHAR(50) NOT NULL,
    `level_value` INTEGER NOT NULL,
    `purpose` TEXT NOT NULL,
    `characteristics` TEXT NOT NULL,
    `focus_area` TEXT NOT NULL,
    `steps_required` VARCHAR(50) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `active` BOOLEAN NULL DEFAULT true,

    UNIQUE INDEX `level_name`(`level_name`),
    UNIQUE INDEX `level_value`(`level_value`),
    PRIMARY KEY (`level_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`subtopic_id`) REFERENCES `subtopics`(`subtopic_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `subtopics` ADD CONSTRAINT `subtopics_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`topic_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `test_executions` ADD CONSTRAINT `test_executions_ibfk_1` FOREIGN KEY (`test_plan_id`) REFERENCES `test_plans`(`test_plan_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `test_executions` ADD CONSTRAINT `test_executions_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `test_plans` ADD CONSTRAINT `test_plans_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `test_templates`(`template_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `test_plans` ADD CONSTRAINT `test_plans_ibfk_2` FOREIGN KEY (`board_id`) REFERENCES `exam_boards`(`board_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `test_plans` ADD CONSTRAINT `test_plans_ibfk_3` FOREIGN KEY (`student_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `test_plans` ADD CONSTRAINT `test_plans_ibfk_4` FOREIGN KEY (`planned_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `test_templates` ADD CONSTRAINT `test_templates_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `test_templates` ADD CONSTRAINT `test_templates_ibfk_2` FOREIGN KEY (`board_id`) REFERENCES `exam_boards`(`board_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `topics` ADD CONSTRAINT `topics_ibfk_1` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`subject_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
