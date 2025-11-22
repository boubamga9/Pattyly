import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SHOP_ID = 'b4dbcab2-7655-49db-902b-a3d8d102223b';
const PRODUCT_ID = '2017d73f-de8d-4ebf-967d-a6464afee0d1';

async function createTestOrders() {
    console.log('🔍 Fetching product info...');
    
    // Récupérer les infos du produit
    const { data: product, error: productError } = await supabase
        .from('products')
        .select('name, base_price')
        .eq('id', PRODUCT_ID)
        .single();
    
    if (productError || !product) {
        console.error('❌ Product not found:', productError);
        process.exit(1);
    }
    
    console.log('✅ Product found:', product.name, '- Price:', product.base_price);
    
    // Calculer les dates du mois en cours
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    console.log('📅 Creating 12 orders from', firstDayOfMonth.toISOString().split('T')[0], 'to', lastDayOfMonth.toISOString().split('T')[0]);
    
    const orders = [];
    const statuses = ['pending', 'confirmed', 'quoted', 'completed'];
    
    for (let i = 1; i <= 12; i++) {
        // Répartir les dates sur le mois
        const daysToAdd = Math.min(i - 1, lastDayOfMonth.getDate() - 1);
        const orderDate = new Date(firstDayOfMonth);
        orderDate.setDate(firstDayOfMonth.getDate() + daysToAdd);
        
        const pickupDate = orderDate.toISOString().split('T')[0];
        const createdAt = new Date(firstDayOfMonth);
        createdAt.setDate(firstDayOfMonth.getDate() + daysToAdd);
        createdAt.setHours(10, 0, 0, 0);
        
        // Générer un order_ref aléatoire
        const orderRef = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        orders.push({
            shop_id: SHOP_ID,
            product_id: PRODUCT_ID,
            customer_name: `Client Test ${i}`,
            customer_email: `test.client.${i}@example.com`,
            customer_phone: `06${String(i).padStart(8, '0')}`,
            pickup_date: pickupDate,
            status: statuses[i % 4],
            total_amount: (product.base_price || 25) + (i * 5),
            product_name: product.name,
            order_ref: orderRef,
            created_at: createdAt.toISOString()
        });
    }
    
    console.log('📦 Inserting 12 orders...');
    const { data, error } = await supabase
        .from('orders')
        .insert(orders)
        .select('id, customer_name, pickup_date, status');
    
    if (error) {
        console.error('❌ Error creating orders:', error);
        process.exit(1);
    }
    
    console.log('✅ Successfully created 12 test orders:');
    data.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.customer_name} - ${order.pickup_date} - ${order.status} (${order.id})`);
    });
    
    console.log('\n📊 Summary:');
    console.log(`   Shop ID: ${SHOP_ID}`);
    console.log(`   Product ID: ${PRODUCT_ID}`);
    console.log(`   Total orders created: ${data.length}`);
    console.log(`   Date range: ${firstDayOfMonth.toISOString().split('T')[0]} to ${lastDayOfMonth.toISOString().split('T')[0]}`);
}

createTestOrders().catch(console.error);

