import { Hono } from 'hono'
import { pool } from './db';
import { syncNusacontactCustomer } from './service/is';
import { syncNusacontactContact } from './service/nusacontact';
import { HOST, PORT } from './config';

const app = new Hono()

interface SyncContactBody {
  contactNumber: string;
  customerId: string;
  contactName: string;
}

// POST endpoint /sync-is-nusacontact
app.post('/sync-is-nusacontact', async (c) => {
  try {
    const body: SyncContactBody = await c.req.json();

    const connection = await pool.getConnection();

    try {
      const contact = await syncNusacontactCustomer(body.contactNumber, body.customerId, body.contactName)
      if(contact){
        syncNusacontactContact(contact)
        return c.json({
          success: true,
          message: 'Contact created successfully',
        }, 200);
      }else{
        return c.json({
          success: false,
          message: 'Contact not found',
        }, 404);
      }
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error syncing contact:', error);
    
    return c.json({
      success: false,
      message: 'Internal server error',
    }, 500);
  }
});


// Start server
export default {
  port:  PORT,
  hostname: HOST,
  fetch: app.fetch,
};

console.log(`🚀 Server running on http://${HOST}:${PORT}`);