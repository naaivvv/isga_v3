-- Enhanced calibration table with statistical validation
-- This replaces the old calibration table structure

-- Drop old tables if they exist
DROP TABLE IF EXISTS co_calibration;

-- Create new unified calibration table
CREATE TABLE IF NOT EXISTS calibration_v2 (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gas_type ENUM('CO', 'CO2', 'O2') NOT NULL,
  reference_value FLOAT NOT NULL COMMENT 'Laboratory reference value',
  
  -- Trial data (3 trials, each with 10 samples)
  trial_1_readings TEXT COMMENT 'JSON array of 10 readings',
  trial_2_readings TEXT COMMENT 'JSON array of 10 readings',
  trial_3_readings TEXT COMMENT 'JSON array of 10 readings',
  
  -- Calculated averages
  trial_1_avg FLOAT,
  trial_2_avg FLOAT,
  trial_3_avg FLOAT,
  
  -- Statistical validation
  t_value FLOAT COMMENT 'T-test result',
  passed TINYINT(1) COMMENT '1 if calibration passed, 0 if failed',
  
  -- Linear regression correction factors
  correction_slope FLOAT DEFAULT 1,
  correction_intercept FLOAT DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_gas_type (gas_type)
);

-- Insert default values
INSERT INTO calibration_v2 (gas_type, reference_value, passed) VALUES 
  ('CO', 0, 0),
  ('CO2', 0, 0),
  ('O2', 20.9, 0)
ON DUPLICATE KEY UPDATE gas_type = gas_type;
