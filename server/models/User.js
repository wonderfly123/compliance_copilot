const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

const User = {
  // Find user by email
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      return null;
    }
    
    return data;
  },
  
  // Find user by ID
  async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return null;
    }
    
    return data;
  },
  
  // Create user
  async create({ name, email, password, role = 'user' }) {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert user into database
    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          name,
          email,
          password: hashedPassword,
          role,
          created_at: new Date()
        }
      ])
      .select();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data[0];
  },
  
  // Match password
  async matchPassword(user, enteredPassword) {
    return await bcrypt.compare(enteredPassword, user.password);
  }
};

module.exports = User;
