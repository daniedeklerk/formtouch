import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: process.env.PG_SSL === 'true',
});

export interface Form {
  id: number;
  name: string;
  folder_path: string;
  last_modified: Date;
  created_at: Date;
  updated_at: Date;
}

export interface FormPage {
  id: number;
  form_id: number;
  page_number: number;
  image_data: Buffer;
  original_width?: number;
  original_height?: number;
  rendered_width?: number;
  rendered_height?: number;
  paper_size?: string;
  orientation?: string;
  scale?: number;
  dpi?: number;
  created_at: Date;
}

export interface FormField {
  id: number;
  form_id: number;
  label: string;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  created_at: Date;
  updated_at: Date;
}

export const db = {
  async getForms(): Promise<Form[]> {
    const result = await pool.query('SELECT * FROM forms ORDER BY updated_at DESC');
    return result.rows;
  },

  async getFormById(id: number): Promise<Form | null> {
    const result = await pool.query('SELECT * FROM forms WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async getFormPages(formId: number): Promise<FormPage[]> {
    const result = await pool.query(
      'SELECT * FROM form_pages WHERE form_id = $1 ORDER BY page_number',
      [formId]
    );
    return result.rows;
  },

  async getFormFields(formId: number): Promise<FormField[]> {
    const result = await pool.query(
      'SELECT * FROM form_fields WHERE form_id = $1',
      [formId]
    );
    return result.rows;
  },

  async createForm(name: string, folderPath: string): Promise<Form> {
    const result = await pool.query(
      'INSERT INTO forms (name, folder_path, last_modified) VALUES ($1, $2, NOW()) RETURNING *',
      [name, folderPath]
    );
    return result.rows[0];
  },

  async updateForm(id: number, data: Partial<Form>): Promise<Form> {
    const sets: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        sets.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    values.push(id);
    const query = `
      UPDATE forms 
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async saveFormPage(formId: number, pageNumber: number, imageData: Buffer): Promise<FormPage> {
    const result = await pool.query(
      'INSERT INTO form_pages (form_id, page_number, image_data) VALUES ($1, $2, $3) RETURNING *',
      [formId, pageNumber, imageData]
    );
    return result.rows[0];
  },

  async saveFormField(formId: number, field: Omit<FormField, 'id' | 'created_at' | 'updated_at'>): Promise<FormField> {
    const result = await pool.query(
      `INSERT INTO form_fields 
       (form_id, label, page_number, x, y, width, height) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [field.form_id, field.label, field.page_number, field.x, field.y, field.width, field.height]
    );
    return result.rows[0];
  },

  async searchForms(query: string): Promise<Form[]> {
    const result = await pool.query(
      'SELECT * FROM forms WHERE name ILIKE $1 ORDER BY updated_at DESC',
      [`%${query}%`]
    );
    return result.rows;
  }
};
