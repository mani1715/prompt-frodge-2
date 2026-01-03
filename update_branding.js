const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'mspndev';

async function updateBranding() {
    const client = new MongoClient(MONGO_URL);
    
    try {
        await client.connect();
        console.log('✓ Connected to MongoDB');
        
        const db = client.db(DB_NAME);
        
        // Update content collection
        const contentResult = await db.collection('content').updateMany(
            {},
            {
                $set: {
                    'hero.title': 'PROMPT FORGE',
                    'hero.tagline': 'Crafting AI Excellence with Cutting-Edge Technology',
                    'hero.description': 'We transform ideas into powerful AI-driven solutions using advanced prompt engineering and modern web technologies.',
                    'about.title': 'About PROMPT FORGE',
                    'about.description': 'PROMPT FORGE is a cutting-edge AI development company specializing in prompt engineering, AI-assisted development, and creating powerful digital solutions that harness the full potential of artificial intelligence.',
                    'footer.text': '© 2025 PROMPT FORGE. All rights reserved. Powered by AI.'
                }
            }
        );
        console.log(`✓ Updated ${contentResult.modifiedCount} content document(s)`);
        
        // Update contact info
        const contactResult = await db.collection('contact').updateMany(
            {},
            {
                $set: {
                    'email': 'hello@promptforge.dev',
                    'phone': '+1 (555) FORGE-AI'
                }
            }
        );
        console.log(`✓ Updated ${contactResult.modifiedCount} contact document(s)`);
        
        console.log('\n✅ Branding update complete!');
        console.log('   MSPN DEV → PROMPT FORGE');
        console.log('   Neon Blue theme applied\n');
        
    } catch (error) {
        console.error('❌ Error updating branding:', error);
    } finally {
        await client.close();
    }
}

updateBranding();
