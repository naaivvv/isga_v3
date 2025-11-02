-- SQL script to create schedule and calibration tables
-- Run this in your MySQL database 'isga'

-- Create schedule table
CREATE TABLE IF NOT EXISTS schedule (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hours INT NOT NULL DEFAULT 0,
  minutes INT NOT NULL DEFAULT 30,
  active TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default schedule configuration
INSERT INTO schedule (hours, minutes, active) VALUES (0, 30, 0);

-- Create calibration table
CREATE TABLE IF NOT EXISTS calibration (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gas_type VARCHAR(10) NOT NULL,
  calibrated_value FLOAT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_gas_type (gas_type)
);

-- Insert default calibration values
INSERT INTO calibration (gas_type, calibrated_value) VALUES 
  ('CO', 0),
  ('CO2', 0),
  ('O2', 20.9);
