const { supabase } = require('../config/db');

const Plan = {
  // Get all plans for a user
  async findByUser(userId, filters = {}) {
    let query = supabase
      .from('plans')
      .select('*')
      .eq('owner', userId)
      .order('created_at', { ascending: false });
    
    // Apply filters if provided
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data;
  },
  
  // Find plan by ID
  async findById(id) {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      return null;
    }
    
    return data;
  },
  
  // Create plan
  async create(planData) {
    const { data, error } = await supabase
      .from('plans')
      .insert([{
        ...planData,
        created_at: new Date()
      }])
      .select();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data[0];
  },
  
  // Update plan
  async update(id, planData) {
    const { data, error } = await supabase
      .from('plans')
      .update(planData)
      .eq('id', id)
      .select();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data[0];
  },
  
  // Delete plan
  async delete(id) {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(error.message);
    }
    
    return true;
  },
  
  // Upload plan file to storage
  async uploadFile(file, filePath) {
    const { data, error } = await supabase
      .storage
      .from('plans')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('plans')
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  }
};

module.exports = Plan;
