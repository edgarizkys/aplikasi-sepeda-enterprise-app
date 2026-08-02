import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Starting database seed...');

  try {
    // Clear existing data
    await prisma.item.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    // Create default tenant
    const tenant = await prisma.tenant.create({
      data: {
        id: 'tenant-default',
        name: 'Aplikasi Sepeda Enterprise',
        slug: 'aplikasi-sepeda-enterprise',
        description: 'Enterprise bike management system',
        isActive: true,
      },
    });
    console.log('[SEED] Tenant created:', tenant.id);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        id: 'user-admin-001',
        tenantId: tenant.id,
        email: 'admin@aplikasisepeda.local',
        name: 'Administrator',
        password: await hash('Admin@123', 12),
        role: 'ADMIN',
        isActive: true,
        emailVerified: new Date(),
      },
    });
    console.log('[SEED] Admin user created:', adminUser.email);

    // Create sample items
    const items = await prisma.item.createMany({
      data: [
        {
          id: 'item-001',
          tenantId: tenant.id,
          name: 'Sepeda Mountain Bike',
          description: 'Sepeda gunung dengan suspensi penuh untuk medan berat',
          status: 'active',
          createdById: adminUser.id,
        },
        {
          id: 'item-002',
          tenantId: tenant.id,
          name: 'Sepeda Road Bike',
          description: 'Sepeda balap ringan untuk jalan raya berkecepatan tinggi',
          status: 'active',
          createdById: adminUser.id,
        },
        {
          id: 'item-003',
          tenantId: tenant.id,
          name: 'Sepeda Hybrid',
          description: 'Sepeda serbaguna untuk penggunaan sehari-hari',
          status: 'active',
          createdById: adminUser.id,
        },
        {
          id: 'item-004',
          tenantId: tenant.id,
          name: 'Sepeda BMX',
          description: 'Sepeda khusus untuk trik dan stunt',
          status: 'active',
          createdById: adminUser.id,
        },
        {
          id: 'item-005',
          tenantId: tenant.id,
          name: 'Sepeda Lipat',
          description: 'Sepeda portabel yang dapat dilipat untuk kemudahan penyimpanan',
          status: 'inactive',
          createdById: adminUser.id,
        },
      ],
    });
    console.log('[SEED] Items created:', items.count);

    // Create analytics records
    const analyticsData = [
      {
        id: 'analytics-001',
        tenantId: tenant.id,
        metric: 'total_items',
        value: 5,
        period: 'daily',
        recordedAt: new Date(),
      },
      {
        id: 'analytics-002',
        tenantId: tenant.id,
        metric: 'active_items',
        value: 4,
        period: 'daily',
        recordedAt: new Date(),
      },
      {
        id: 'analytics-003',
        tenantId: tenant.id,
        metric: 'inactive_items',
        value: 1,
        period: 'daily',
        recordedAt: new Date(),
      },
    ];

    for (const data of analyticsData) {
      await prisma.analytics.create({ data });
    }
    console.log('[SEED] Analytics records created:', analyticsData.length);

    console.log('[SEED] ✓ Database seed completed successfully');
    console.log('[SEED] Default tenant ID:', tenant.id);
    console.log('[SEED] Admin email: admin@aplikasisepeda.local');
    console.log('[SEED] Admin password: Admin@123');
  } catch (error) {
    console.error('[SEED] Error during seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });