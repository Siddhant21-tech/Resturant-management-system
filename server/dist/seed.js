"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    // Clean existing records in reverse dependency order
    await prisma.payment.deleteMany();
    await prisma.billAdjustment.deleteMany();
    await prisma.billItem.deleteMany();
    await prisma.bill.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.orderRound.deleteMany();
    await prisma.diningSession.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.menuCategory.deleteMany();
    await prisma.table.deleteMany();
    await prisma.kitchenStation.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.restaurant.deleteMany();
    // 1. Create Restaurants (Multi-tenancy)
    const bistro = await prisma.restaurant.create({
        data: {
            name: 'The Velvet Bistro',
            slug: 'the-velvet-bistro',
            taxRate: 5.0, // 5% GST
            currency: '₹',
        },
    });
    const spice = await prisma.restaurant.create({
        data: {
            name: 'Spice Symphony',
            slug: 'spice-symphony',
            taxRate: 5.0,
            currency: '₹',
        },
    });
    console.log(`✅ Created Restaurants: ${bistro.name}, ${spice.name}`);
    // 2. Branches for The Velvet Bistro
    const downtown = await prisma.branch.create({
        data: {
            restaurantId: bistro.id,
            name: 'Downtown Flagship',
            address: '42 Promenade Avenue, Connaught Place',
            phone: '+91 98765 43210',
        },
    });
    const midtown = await prisma.branch.create({
        data: {
            restaurantId: bistro.id,
            name: 'Midtown Rooftop Lounge',
            address: 'Skydeck Level 14, Business Bay',
            phone: '+91 98765 43211',
        },
    });
    // Branch for Spice Symphony
    await prisma.branch.create({
        data: {
            restaurantId: spice.id,
            name: 'Indiranagar Central',
            address: '100ft Road, Bengaluru',
            phone: '+91 98765 11111',
        },
    });
    console.log(`✅ Created Branches: ${downtown.name}, ${midtown.name}`);
    // 3. Kitchen Stations for Downtown Flagship
    const mainKitchen = await prisma.kitchenStation.create({
        data: {
            branchId: downtown.id,
            name: 'Main Kitchen',
            colorCode: '#f97316', // Orange
            sortOrder: 1,
        },
    });
    const barStation = await prisma.kitchenStation.create({
        data: {
            branchId: downtown.id,
            name: 'Bar & Beverage',
            colorCode: '#3b82f6', // Blue
            sortOrder: 2,
        },
    });
    const dessertStation = await prisma.kitchenStation.create({
        data: {
            branchId: downtown.id,
            name: 'Dessert & Bakery',
            colorCode: '#ec4899', // Pink
            sortOrder: 3,
        },
    });
    const starterStation = await prisma.kitchenStation.create({
        data: {
            branchId: downtown.id,
            name: 'Starters & Pantry',
            colorCode: '#10b981', // Emerald
            sortOrder: 4,
        },
    });
    console.log('✅ Created Kitchen Stations');
    // 4. Users / Roles
    const waiterRahul = await prisma.user.create({
        data: {
            restaurantId: bistro.id,
            branchId: downtown.id,
            name: 'Rahul Sharma',
            email: 'rahul@velvetbistro.com',
            role: 'WAITER',
            pinCode: '1001',
        },
    });
    const waiterSarah = await prisma.user.create({
        data: {
            restaurantId: bistro.id,
            branchId: downtown.id,
            name: 'Sarah Jenkins',
            email: 'sarah@velvetbistro.com',
            role: 'WAITER',
            pinCode: '1002',
        },
    });
    const chefMario = await prisma.user.create({
        data: {
            restaurantId: bistro.id,
            branchId: downtown.id,
            name: 'Chef Mario Rossi',
            email: 'mario@velvetbistro.com',
            role: 'KITCHEN_STAFF',
            pinCode: '2001',
        },
    });
    const cashierPriya = await prisma.user.create({
        data: {
            restaurantId: bistro.id,
            branchId: downtown.id,
            name: 'Priya Verma',
            email: 'priya@velvetbistro.com',
            role: 'CASHIER',
            pinCode: '3001',
        },
    });
    const managerVikram = await prisma.user.create({
        data: {
            restaurantId: bistro.id,
            branchId: downtown.id,
            name: 'Vikram Mehta',
            email: 'vikram@velvetbistro.com',
            role: 'MANAGER',
            pinCode: '9999',
        },
    });
    console.log('✅ Created Staff Users');
    // 5. Tables for Downtown
    const tableNumbers = [
        { num: 'Table 15', cap: 4, zone: 'Main Dining' },
        { num: 'Table 01', cap: 2, zone: 'Window View' },
        { num: 'Table 02', cap: 4, zone: 'Main Dining' },
        { num: 'Table 03', cap: 6, zone: 'Family Booth' },
        { num: 'Table 04', cap: 2, zone: 'Patio Terrace' },
        { num: 'Table 05', cap: 4, zone: 'Patio Terrace' },
        { num: 'Table 06', cap: 8, zone: 'VIP Lounge' },
    ];
    const createdTables = {};
    for (const t of tableNumbers) {
        const table = await prisma.table.create({
            data: {
                branchId: downtown.id,
                number: t.num,
                capacity: t.cap,
                zone: t.zone,
                status: 'AVAILABLE',
            },
        });
        createdTables[t.num] = table;
    }
    console.log('✅ Created Tables');
    // 6. Menu Categories
    const catPizzas = await prisma.menuCategory.create({
        data: { branchId: downtown.id, name: 'Wood-Fired Pizzas', sortOrder: 1 },
    });
    const catMains = await prisma.menuCategory.create({
        data: { branchId: downtown.id, name: 'Burgers & Mains', sortOrder: 2 },
    });
    const catStarters = await prisma.menuCategory.create({
        data: { branchId: downtown.id, name: 'Artisanal Starters', sortOrder: 3 },
    });
    const catDrinks = await prisma.menuCategory.create({
        data: { branchId: downtown.id, name: 'Beverages & Coffee', sortOrder: 4 },
    });
    const catDesserts = await prisma.menuCategory.create({
        data: { branchId: downtown.id, name: 'Decadent Desserts', sortOrder: 5 },
    });
    // 7. Menu Items with Station Routing
    const items = [
        {
            categoryId: catPizzas.id,
            name: 'Artisan Wood-Fired Margherita',
            description: 'San Marzano tomatoes, fresh buffalo mozzarella, fragrant sweet basil, extra virgin olive oil.',
            price: 300,
            stationId: mainKitchen.id,
            isVeg: true,
            imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500&auto=format&fit=crop&q=80',
        },
        {
            categoryId: catPizzas.id,
            name: 'Truffle Mushroom Pizza',
            description: 'Wild forest mushrooms, fontina cheese, white truffle emulsion, thyme.',
            price: 380,
            stationId: mainKitchen.id,
            isVeg: true,
            imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80',
        },
        {
            categoryId: catMains.id,
            name: 'Smoked Prime Burger',
            description: 'Brioche bun, smoked cheddar, house relish, caramelized onions, crisp potato wedges.',
            price: 320,
            stationId: mainKitchen.id,
            isVeg: false,
            imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
        },
        {
            categoryId: catStarters.id,
            name: 'Classic Tomato Bruschetta',
            description: 'Toasted sourdough, heirloom tomatoes, roasted garlic, balsamic glaze.',
            price: 180,
            stationId: starterStation.id,
            isVeg: true,
            imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=500&auto=format&fit=crop&q=80',
        },
        {
            categoryId: catDrinks.id,
            name: 'Chilled Coca Cola',
            description: 'Ice cold classic refreshment with lemon wedge and fresh mint.',
            price: 80,
            stationId: barStation.id,
            isVeg: true,
            imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
        },
        {
            categoryId: catDrinks.id,
            name: 'Specialty Roasted Coffee',
            description: 'Double shot arabica espresso poured over steamed velvety oat or dairy milk.',
            price: 120,
            stationId: barStation.id,
            isVeg: true,
            imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&auto=format&fit=crop&q=80',
        },
        {
            categoryId: catDrinks.id,
            name: 'Sparkling Passionfruit Cooler',
            description: 'Fresh passionfruit puree, sparkling water, crushed ice, kaffir lime leaf.',
            price: 190,
            stationId: barStation.id,
            isVeg: true,
            imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
        },
        {
            categoryId: catDesserts.id,
            name: 'Molten Chocolate Lava Cake',
            description: 'Warm chocolate cake with a molten Belgian dark ganache center, Madagascar vanilla bean scoop.',
            price: 240,
            stationId: dessertStation.id,
            isVeg: true,
            imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=80',
        },
        {
            categoryId: catDesserts.id,
            name: 'Classic Venetian Tiramisu',
            description: 'Espresso-soaked savoiardi, mascarpone cream, Dutch cocoa dusting.',
            price: 220,
            stationId: dessertStation.id,
            isVeg: true,
            imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=80',
        },
    ];
    const createdMenuItems = {};
    for (const item of items) {
        const created = await prisma.menuItem.create({
            data: {
                branchId: downtown.id,
                ...item,
            },
        });
        createdMenuItems[item.name] = created;
    }
    console.log(`✅ Created ${items.length} Menu Items across 4 kitchen stations`);
    // 8. Scenario: Table 15 Live Session (#S10045) from user description!
    // Customer arrives at Table 15, Waiter Rahul opens session S-10045
    // Order #1: Pizza x 2 (₹600), Coke x 2 (₹160)
    const table15 = createdTables['Table 15'];
    const session15 = await prisma.diningSession.create({
        data: {
            branchId: downtown.id,
            tableId: table15.id,
            waiterId: waiterRahul.id,
            sessionCode: 'S-10045',
            guestCount: 2,
            status: 'ACTIVE',
        },
    });
    await prisma.table.update({
        where: { id: table15.id },
        data: {
            status: 'OCCUPIED',
            currentSessionId: session15.id,
        },
    });
    // Order Round 1: Waiter Rahul took 2x Pizza, 2x Coke
    const pizzaItem = createdMenuItems['Artisan Wood-Fired Margherita'];
    const cokeItem = createdMenuItems['Chilled Coca Cola'];
    const round1 = await prisma.orderRound.create({
        data: {
            sessionId: session15.id,
            roundNumber: 1,
            source: 'WAITER',
            status: 'ACCEPTED',
            notes: 'Customer requested crispy crust',
            acceptedAt: new Date(Date.now() - 45 * 1000), // Accepted 45 seconds ago -> Still inside 3-min window!
            items: {
                create: [
                    {
                        menuItemId: pizzaItem.id,
                        stationId: mainKitchen.id,
                        quantity: 2,
                        unitPrice: pizzaItem.price,
                        status: 'ACCEPTED',
                        acceptedAt: new Date(Date.now() - 45 * 1000),
                    },
                    {
                        menuItemId: cokeItem.id,
                        stationId: barStation.id,
                        quantity: 2,
                        unitPrice: cokeItem.price,
                        status: 'PREPARING', // In preparation at the Bar
                        acceptedAt: new Date(Date.now() - 45 * 1000),
                    },
                ],
            },
        },
    });
    console.log(`✅ Pre-seeded Table 15 Session ${session15.sessionCode} with Round #1 (Pizzas + Cokes)`);
    console.log('🎉 Seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
