import { PrismaClient, UserRole, ActionType, EventStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // 1. Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@eventflow.com' },
    update: {},
    create: {
      email: 'admin@eventflow.com',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // 2. Create sample event sources
  const paymentSource = await prisma.appSource.upsert({
    where: { id: 'source-payment' },
    update: {},
    create: {
      id: 'source-payment',
      name: 'Payment System',
      description: 'Handles payment events from payment gateway',
      apiKey: await bcrypt.hash('ef_payment_api_key_12345', 10),
      apiKeySalt: 'sample_salt_1',
      isActive: true,
      createdBy: admin.id,
    },
  });
  console.log('✅ Created source:', paymentSource.name);

  const inventorySource = await prisma.appSource.upsert({
    where: { id: 'source-inventory' },
    update: {},
    create: {
      id: 'source-inventory',
      name: 'Inventory System',
      description: 'Monitors inventory levels and stock events',
      apiKey: await bcrypt.hash('ef_inventory_api_key_67890', 10),
      apiKeySalt: 'sample_salt_2',
      isActive: true,
      createdBy: admin.id,
    },
  });
  console.log('✅ Created source:', inventorySource.name);

  // 3. Create automation rules
  const highValuePaymentRule = await prisma.automationRule.upsert({
    where: { id: 'rule-high-value-payment' },
    update: {},
    create: {
      id: 'rule-high-value-payment',
      name: 'High Value Payment Alert',
      description: 'Alert finance team when payment exceeds $1000',
      eventType: 'payment.completed',
      priority: 10,
      conditions: {
        all: [
          {
            field: 'payload.amount',
            operator: '>',
            value: 1000,
          },
        ],
      } as any,
      conditionText: 'payload.amount > 1000',
      actions: [
        {
          type: ActionType.CALL_WEBHOOK,
          config: {
            url: 'https://webhook.site/unique-id-here',
            method: 'POST',
          },
        },
        {
          type: ActionType.SEND_EMAIL,
          config: {
            to: 'finance@example.com',
            subject: 'High Value Payment Alert',
            body: 'A payment of ${{payload.amount}} was processed.',
          },
        },
      ] as any,
      isActive: true,
      createdBy: admin.id,
    },
  });
  console.log('✅ Created rule:', highValuePaymentRule.name);

  const lowInventoryRule = await prisma.automationRule.upsert({
    where: { id: 'rule-low-inventory' },
    update: {},
    create: {
      id: 'rule-low-inventory',
      name: 'Low Inventory Alert',
      description: 'Notify procurement when inventory is low',
      eventType: 'inventory.low',
      sourceId: inventorySource.id,
      priority: 5,
      conditions: {
        all: [
          {
            field: 'payload.quantity',
            operator: '<',
            value: 10,
          },
        ],
      } as any,
      conditionText: 'payload.quantity < 10',
      actions: [
        {
          type: ActionType.CALL_WEBHOOK,
          config: {
            url: 'https://webhook.site/procurement-webhook',
            method: 'POST',
          },
        },
      ] as any,
      isActive: true,
      createdBy: admin.id,
    },
  });
  console.log('✅ Created rule:', lowInventoryRule.name);

  const complexRule = await prisma.automationRule.upsert({
    where: { id: 'rule-payment-failed-retry' },
    update: {},
    create: {
      id: 'rule-payment-failed-retry',
      name: 'Payment Failed After Retries',
      description: 'Handle payment failures after multiple retry attempts',
      eventType: 'payment.failed',
      priority: 8,
      conditions: {
        all: [
          {
            field: 'payload.retryCount',
            operator: '>=',
            value: 2,
          },
          {
            any: [
              {
                field: 'payload.region',
                operator: '==',
                value: 'EU',
              },
              {
                field: 'payload.amount',
                operator: '>',
                value: 100,
              },
            ],
          },
        ],
      } as any,
      conditionText: 'payload.retryCount >= 2 AND (payload.region == EU OR payload.amount > 100)',
      actions: [
        {
          type: ActionType.CALL_WEBHOOK,
          config: {
            url: 'https://webhook.site/failed-payment-handler',
            method: 'POST',
          },
        },
        {
          type: ActionType.CREATE_NOTIFICATION,
          config: {
            type: 'urgent',
            message: 'Payment failed after retries',
          },
        },
      ] as any,
      isActive: true,
      createdBy: admin.id,
    },
  });
  console.log('✅ Created rule:', complexRule.name);

  // 4. Create sample events
  const sampleEvents = [
    {
      sourceId: paymentSource.id,
      eventType: 'payment.completed',
      correlationId: 'payment-12345-unique',
      payload: {
        orderId: 'order-987',
        amount: 1500,
        currency: 'USD',
        customerId: 'cust-456',
      },
      status: EventStatus.RECEIVED,
    },
    {
      sourceId: inventorySource.id,
      eventType: 'inventory.low',
      correlationId: 'inventory-789-unique',
      payload: {
        productId: 'prod-123',
        quantity: 5,
        warehouse: 'EU-West',
      },
      status: EventStatus.RECEIVED,
    },
    {
      sourceId: paymentSource.id,
      eventType: 'payment.failed',
      correlationId: 'payment-failed-001',
      payload: {
        orderId: 'order-999',
        amount: 250,
        currency: 'EUR',
        retryCount: 3,
        region: 'EU',
        reason: 'insufficient_funds',
      },
      status: EventStatus.RECEIVED,
    },
  ];

  for (const eventData of sampleEvents) {
    await prisma.event.create({
      data: eventData as any,
    });
  }
  console.log(`✅ Created ${sampleEvents.length} sample events`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Quick Start:');
  console.log(`   Admin Email: admin@eventflow.com`);
  console.log(`   Admin Password: admin123`);
  console.log(`   Payment Source ID: ${paymentSource.id}`);
  console.log(`   Inventory Source ID: ${inventorySource.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
