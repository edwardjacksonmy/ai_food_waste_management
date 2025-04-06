-- Users Table: Stores both donors and recipients
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    address TEXT,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    user_type VARCHAR(20) NOT NULL,  -- 'donor' or 'recipient'
    organization_name VARCHAR(255),
    profile_picture VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Food Categories Table: For categorizing food donations
CREATE TABLE food_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    shelf_life_typical INT,  -- Typical shelf life in hours
    image VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Food Donations Table: Stores information about available food
CREATE TABLE food_donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    food_type UUID REFERENCES food_categories(id),
    quantity DECIMAL(10, 2) NOT NULL,
    quantity_unit VARCHAR(50) NOT NULL,
    prepared_date TIMESTAMP WITH TIME ZONE,
    expiration_date TIMESTAMP WITH TIME ZONE NOT NULL,
    -- Per-donation location data
    pickup_address TEXT,
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    is_different_location BOOLEAN DEFAULT FALSE,
    -- Pickup time window
    pickup_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_perishable BOOLEAN DEFAULT TRUE,
    storage_requirements TEXT,
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'pending', 'claimed', 'completed', 'expired'
    images TEXT,  -- Store image URLs as JSON or comma-separated
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table: Records matches between donors and recipients
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donation_id UUID NOT NULL REFERENCES food_donations(id),
    recipient_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'requested', -- 'requested', 'confirmed', 'rejected', 'completed', 'canceled'
    scheduled_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    donor_rating INT,  -- 1-5 rating
    recipient_rating INT,  -- 1-5 rating
    donor_feedback TEXT,
    recipient_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table: Stores system notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    transaction_id UUID REFERENCES transactions(id),
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Preferences Table: Stores user settings and preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    preferred_food_categories JSONB,  -- Stores array of category IDs
    preferred_pickup_distance INT,  -- Maximum distance in km for recipients
    notification_settings JSONB,  -- Notification preferences as JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Impact Metrics Table: Tracks environmental and social impact
CREATE TABLE impact_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id),
    food_weight DECIMAL(10, 2),  -- Weight in kg
    co2_saved DECIMAL(10, 2),  -- CO2 emissions saved in kg
    meals_provided INT,  -- Estimated number of meals
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Route Plans Table: For optimized pickup routes
CREATE TABLE route_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Route Stops Table: Individual stops in a route
CREATE TABLE route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_plan_id UUID NOT NULL REFERENCES route_plans(id),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    stop_order INT NOT NULL,
    estimated_arrival_time TIMESTAMP WITH TIME ZONE,
    actual_arrival_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS (Row Level Security) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Example policy for users table
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Create policy for food donations
CREATE POLICY "Anyone can view available donations" ON food_donations
    FOR SELECT USING (status = 'available');

CREATE POLICY "Donors can manage their own donations" ON food_donations
    FOR ALL USING (auth.uid() = donor_id);

-- Add indexes for common queries
CREATE INDEX idx_food_donations_status ON food_donations(status);
CREATE INDEX idx_food_donations_expiration ON food_donations(expiration_date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_food_donations_location ON food_donations(pickup_latitude, pickup_longitude);