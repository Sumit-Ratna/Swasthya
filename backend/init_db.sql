
-- Create Database
CREATE DATABASE IF NOT EXISTS lab_report;
USE lab_report;

-- 1. Users Table (Patients, Doctors, Admins)
CREATE TABLE Users (
    id CHAR(36) PRIMARY KEY, -- UUID
    phone VARCHAR(255) NOT NULL UNIQUE,
    pan_hash VARCHAR(255),
    role ENUM('patient', 'doctor', 'admin') DEFAULT 'patient',
    
    -- Personal Details
    name VARCHAR(255),
    profile_photo VARCHAR(255), -- URL
    email VARCHAR(255),
    dob DATE,
    gender VARCHAR(50),
    blood_group VARCHAR(10),
    marital_status VARCHAR(50),
    height FLOWT,
    weight FLOAT,
    address_city VARCHAR(255),
    address_state VARCHAR(255),
    emergency_contacts JSON,
    
    -- Medical History (JSON)
    medical_history JSON,
    
    -- Lifestyle (JSON)
    lifestyle JSON,
    
    -- Doctor Specifics
    specialization VARCHAR(255),
    hospital_name VARCHAR(255),
    doctor_qr_id VARCHAR(255) UNIQUE,
    
    -- Auth
    biometric_enabled BOOLEAN DEFAULT FALSE,
    biometric_secret VARCHAR(255),
    refresh_token TEXT,
    
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Documents Table (Lab Reports, Prescriptions)
CREATE TABLE Documents (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'lab_report', 'prescription', etc.
    file_url VARCHAR(255) NOT NULL,
    extracted_data JSON, -- AI Analysis results
    summary TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- 3. Doctor-Patient Links (Access Control)
CREATE TABLE DoctorPatientLinks (
    id CHAR(36) PRIMARY KEY,
    doctor_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    linked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (doctor_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- 4. Appointments Table
CREATE TABLE Appointments (
    id CHAR(36) PRIMARY KEY,
    patient_id CHAR(36) NOT NULL,
    doctor_id CHAR(36), -- Can be NULL for general OPD
    type ENUM('OPD', 'VIDEO', 'LAB') DEFAULT 'OPD',
    status ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    appointment_date DATETIME,
    slot_time VARCHAR(50),
    symptoms VARCHAR(255),
    queue_number INT,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES Users(id) ON DELETE SET NULL
);

-- 5. Audit Logs (Security Tracking)
CREATE TABLE AuditLogs (
    id CHAR(36) PRIMARY KEY,
    actor_id CHAR(36) NOT NULL,
    action_type VARCHAR(255),
    target_id VARCHAR(255),
    details JSON,
    ip_address VARCHAR(50),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    -- No Foreign Key constraint on actor_id to allow logs even if user is deleted
);
