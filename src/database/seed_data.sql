// Initialize the database with food categories
// Run this in the Supabase SQL Editor

-- Seed data for food_categories table
INSERT INTO food_categories (name, description, shelf_life_typical, image) VALUES
('Dairy', 'Milk, cheese, yogurt, and other dairy products', 72, 'dairy.jpg'),
('Bakery', 'Bread, pastries, and baked goods', 48, 'bakery.jpg'),
('Fruits', 'Fresh fruits', 120, 'fruits.jpg'),
('Vegetables', 'Fresh vegetables', 168, 'vegetables.jpg'),
('Prepared Meals', 'Ready-to-eat meals and pre-cooked dishes', 24, 'meals.jpg'),
('Canned Goods', 'Canned foods with long shelf life', 8760, 'canned.jpg'),
('Dry Goods', 'Rice, pasta, cereal, and other dry foods', 8760, 'dry_goods.jpg'),
('Meat & Poultry', 'Fresh meat and poultry products', 48, 'meat.jpg'),
('Seafood', 'Fresh seafood products', 24, 'seafood.jpg'),
('Frozen Foods', 'Frozen meals and ingredients', 2160, 'frozen.jpg');

-- Set up Row Level Security (RLS) policies for the tables

-- Users table policies
CREATE POLICY "Users can read their own data" ON users
    FOR SELECT USING (auth.uid() = id);
    
CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Food donations policies
CREATE POLICY "Anyone can view available donations" ON food_donations
    FOR SELECT USING (status = 'available');

CREATE POLICY "Donors can view all their donations" ON food_donations
    FOR SELECT USING (donor_id = auth.uid());

CREATE POLICY "Donors can create donations" ON food_donations
    FOR INSERT WITH CHECK (donor_id = auth.uid());

CREATE POLICY "Donors can update their own donations" ON food_donations
    FOR UPDATE USING (donor_id = auth.uid());

-- Transactions policies
CREATE POLICY "Recipients can view their transactions" ON transactions
    FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "Recipients can create transactions" ON transactions
    FOR INSERT WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Users can view transactions for their donations" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM food_donations 
            WHERE food_donations.id = transactions.donation_id 
            AND food_donations.donor_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE USING (
        recipient_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM food_donations 
            WHERE food_donations.id = transactions.donation_id 
            AND food_donations.donor_id = auth.uid()
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

-- User preferences policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences" ON user_preferences
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can create their own preferences" ON user_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Impact metrics policies
CREATE POLICY "Anyone can view impact metrics" ON impact_metrics
    FOR SELECT USING (true);

CREATE POLICY "Recipients can create impact metrics" ON impact_metrics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM transactions 
            WHERE transactions.id = impact_metrics.transaction_id 
            AND (transactions.recipient_id = auth.uid())
        )
    );

-- Route plans policies
CREATE POLICY "Users can view their own route plans" ON route_plans
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own route plans" ON route_plans
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own route plans" ON route_plans
    FOR UPDATE USING (user_id = auth.uid());

-- Route stops policies
CREATE POLICY "Users can view stops in their routes" ON route_stops
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM route_plans 
            WHERE route_plans.id = route_stops.route_plan_id 
            AND route_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create stops in their routes" ON route_stops
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM route_plans 
            WHERE route_plans.id = route_stops.route_plan_id 
            AND route_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update stops in their routes" ON route_stops
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM route_plans 
            WHERE route_plans.id = route_stops.route_plan_id 
            AND route_plans.user_id = auth.uid()
        )
    );