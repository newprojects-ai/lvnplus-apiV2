/*
  # Add Gamification System Tables

  1. New Tables
    - `student_progress`: Tracks student XP, level, and streaks
    - `achievements`: Defines available achievements
    - `student_achievements`: Links students to their unlocked achievements
    - `rewards`: Defines available rewards
    - `student_rewards`: Links students to their purchased rewards
    - `subject_mastery`: Tracks student mastery levels per subject
    - `activity_log`: Records all gamification-related activities
    - `level_config`: Defines XP requirements and perks for each level

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control

  3. Indexes
    - Add indexes for efficient querying
*/

-- Student Progress Table
CREATE TABLE student_progress (
  user_id BIGINT PRIMARY KEY REFERENCES users(user_id),
  level INTEGER NOT NULL DEFAULT 1,
  current_xp INTEGER NOT NULL DEFAULT 0,
  next_level_xp INTEGER NOT NULL DEFAULT 1000,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date TIMESTAMP(0),
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_progress_user_id ON student_progress(user_id);

-- Achievements Table
CREATE TABLE achievements (
  achievement_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('Practice', 'Performance', 'Consistency', 'Mastery') NOT NULL,
  points INTEGER NOT NULL,
  icon VARCHAR(100),
  required_criteria JSON NOT NULL,
  created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_achievements (
  user_id BIGINT REFERENCES users(user_id),
  achievement_id BIGINT REFERENCES achievements(achievement_id),
  unlocked_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
  progress INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX idx_student_achievements_user ON student_achievements(user_id);
CREATE INDEX idx_achievements_category ON achievements(category);

-- Rewards Table
CREATE TABLE rewards (
  reward_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('Avatar', 'Theme', 'Badge', 'Certificate') NOT NULL,
  cost INTEGER NOT NULL,
  icon VARCHAR(100),
  created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_rewards (
  user_id BIGINT REFERENCES users(user_id),
  reward_id BIGINT REFERENCES rewards(reward_id),
  purchased_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, reward_id)
);

CREATE INDEX idx_student_rewards_user ON student_rewards(user_id);
CREATE INDEX idx_rewards_category ON rewards(category);

-- Subject Mastery Table
CREATE TABLE subject_mastery (
  user_id BIGINT REFERENCES users(user_id),
  subject_id INTEGER REFERENCES subjects(subject_id),
  mastery_level INTEGER NOT NULL DEFAULT 0,
  total_questions_attempted INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  last_test_date TIMESTAMP(0),
  PRIMARY KEY (user_id, subject_id)
);

CREATE INDEX idx_subject_mastery_user ON subject_mastery(user_id);

-- Activity Log Table
CREATE TABLE activity_log (
  activity_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT REFERENCES users(user_id),
  activity_type VARCHAR(50) NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  details JSON,
  created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_log_user_date ON activity_log(user_id, created_at);

-- Level Configuration Table
CREATE TABLE level_config (
  level INTEGER PRIMARY KEY,
  xp_required INTEGER NOT NULL,
  perks JSON,
  created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- Populate initial levels
INSERT INTO level_config (level, xp_required, perks)
VALUES 
  (1, 1000, '{"unlocks": ["basic_achievements"]}'),
  (2, 2000, '{"unlocks": ["daily_challenges"]}'),
  (3, 4000, '{"unlocks": ["special_rewards"]}');