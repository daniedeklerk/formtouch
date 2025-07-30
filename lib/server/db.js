import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables before creating the pool
config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: process.env.PG_SSL === 'true',
});

console.log('Database pool created with config:');
console.log(`Host: ${process.env.PG_HOST}`);
console.log(`Port: ${process.env.PG_PORT}`);
console.log(`Database: ${process.env.PG_DATABASE}`);
console.log(`User: ${process.env.PG_USER}`);

export const db = {
  async getForms() {
    const result = await pool.query('SELECT * FROM forms ORDER BY updated_at DESC');
    return result.rows;
  },

  async getFormById(id) {
    const result = await pool.query('SELECT * FROM forms WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async createForm(name, folderPath) {
    const result = await pool.query(
      'INSERT INTO forms (name, folder_path, last_modified) VALUES ($1, $2, NOW()) RETURNING *',
      [name, folderPath]
    );
    return result.rows[0];
  },

  async updateForm(id, updates) {
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    const result = await pool.query(
      `UPDATE forms SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async searchForms(query) {
    const result = await pool.query(
      'SELECT * FROM forms WHERE name ILIKE $1 ORDER BY updated_at DESC',
      [`%${query}%`]
    );
    return result.rows;
  },

  async getFormPages(formId) {
    const result = await pool.query(
      'SELECT * FROM form_pages WHERE form_id = $1 ORDER BY page_number',
      [formId]
    );
    return result.rows;
  },

  async createFormPage(formId, pageNumber, imageData) {
    const result = await pool.query(
      'INSERT INTO form_pages (form_id, page_number, image_data) VALUES ($1, $2, $3) RETURNING *',
      [formId, pageNumber, imageData]
    );
    return result.rows[0];
  },

  async getFormFields(formId) {
    const result = await pool.query(
      'SELECT * FROM form_fields WHERE form_id = $1 ORDER BY page_number, y',
      [formId]
    );
    return result.rows;
  },

  async createFormField(formId, field) {
    const result = await pool.query(
      'INSERT INTO form_fields (form_id, label, page_number, x, y, width, height) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [formId, field.label, field.page_number, field.x, field.y, field.width, field.height]
    );
    return result.rows[0];
  },

  async updateFormField(id, updates) {
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    const result = await pool.query(
      `UPDATE form_fields SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async deleteFormField(id) {
    await pool.query('DELETE FROM form_fields WHERE id = $1', [id]);
  },

  async deleteFormPage(id) {
    await pool.query('DELETE FROM form_pages WHERE id = $1', [id]);
  },

  async deleteFormPages(formId) {
    const result = await pool.query('DELETE FROM form_pages WHERE form_id = $1 RETURNING *', [formId]);
    return result.rows;
  }
};
