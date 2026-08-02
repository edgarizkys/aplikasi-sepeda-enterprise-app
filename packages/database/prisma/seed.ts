import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seeding...');

  try {
    // Clean existing data
    await prisma.maintenance.deleteMany();
    await prisma.rental.deleteMany();
    await prisma.bike.deleteMany();
    await prisma.rider.deleteMany();
    await prisma.user.deleteMany();

    console.log('[Seed] Database cleaned');

    // Seed Users (Admin & Managers)
    const adminPassword = await bcryptjs.hash('Admin@12345', 10);
    const userPassword = await bcryptjs.hash('User@12345', 10);

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@sepeda-enterprise.com',
        password: adminPassword,
        name: 'Administrator',
        role: 'ADMIN',
        tenantId: 'default',
      },
    });

    const managerUser = await prisma.user.create({
      data: {
        email: 'manager@sepeda-enterprise.com',
        password: userPassword,
        name: 'Fleet Manager',
        role: 'MANAGER',
        tenantId: 'default',
      },
    });

    const operatorUser = await prisma.user.create({
      data: {
        email: 'operator@sepeda-enterprise.com',
        password: userPassword,
        name: 'Fleet Operator',
        role: 'OPERATOR',
        tenantId: 'default',
      },
    });

    console.log('[Seed] Users created:', {
      admin: adminUser.email,
      manager: managerUser.email,
      operator: operatorUser.email,
    });

    // Seed Riders (Employees)
    const rider1 = await prisma.rider.create({
      data: {
        name: 'Adi Pratama',
        email: 'adi.pratama@company.com',
        phone: '081987654321',
        employeeId: 'EMP-2024-001',
        department: 'Marketing',
        joinDate: new Date('2024-03-10'),
        tenantId: 'default',
      },
    });

    const rider2 = await prisma.rider.create({
      data: {
        name: 'Siti Rahma',
        email: 'siti.rahma@company.com',
        phone: '082123456789',
        employeeId: 'EMP-2024-002',
        department: 'Operations',
        joinDate: new Date('2024-05-15'),
        tenantId: 'default',
      },
    });

    const rider3 = await prisma.rider.create({
      data: {
        name: 'Budi Santoso',
        email: 'budi.santoso@company.com',
        phone: '083456789012',
        employeeId: 'EMP-2024-003',
        department: 'Maintenance',
        joinDate: new Date('2024-02-01'),
        tenantId: 'default',
      },
    });

    const rider4 = await prisma.rider.create({
      data: {
        name: 'Rini Wijaya',
        email: 'rini.wijaya@company.com',
        phone: '084567890123',
        employeeId: 'EMP-2024-004',
        department: 'Sales',
        joinDate: new Date('2024-04-20'),
        tenantId: 'default',
      },
    });

    console.log('[Seed] Riders created:', [
      rider1.name,
      rider2.name,
      rider3.name,
      rider4.name,
    ]);

    // Seed Bikes
    const bike1 = await prisma.bike.create({
      data: {
        model: 'Mountain Pro X1',
        serialNumber: 'MTB-2026-001',
        brand: 'Trek',
        bikeType: 'Mountain Bike',
        purchaseDate: new Date('2026-01-15'),
        purchasePrice: 8500000,
        condition: 'excellent',
        status: 'available',
        location: 'Parking A',
        tenantId: 'default',
      },
    });

    const bike2 = await prisma.bike.create({
      data: {
        model: 'Urban Commute 2.0',
        serialNumber: 'URB-2026-002',
        brand: 'Giant',
        bikeType: 'Hybrid',
        purchaseDate: new Date('2026-02-20'),
        purchasePrice: 6200000,
        condition: 'good',
        status: 'in_use',
        location: 'Field',
        tenantId: 'default',
      },
    });

    const bike3 = await prisma.bike.create({
      data: {
        model: 'Road Speed Elite',
        serialNumber: 'ROAD-2026-003',
        brand: 'Specialized',
        bikeType: 'Road Bike',
        purchaseDate: new Date('2026-03-10'),
        purchasePrice: 9200000,
        condition: 'excellent',
        status: 'available',
        location: 'Parking B',
        tenantId: 'default',
      },
    });

    const bike4 = await prisma.bike.create({
      data: {
        model: 'Electric City Cruiser',
        serialNumber: 'ELEC-2026-004',
        brand: 'BMC',
        bikeType: 'Electric',
        purchaseDate: new Date('2026-04-05'),
        purchasePrice: 12000000,
        condition: 'excellent',
        status: 'available',
        location: 'Charging Station',
        tenantId: 'default',
      },
    });

    const bike5 = await prisma.bike.create({
      data: {
        model: 'Kids Adventure',
        serialNumber: 'KID-2026-005',
        brand: 'Polygon',
        bikeType: 'Kids Bike',
        purchaseDate: new Date('2026-05-12'),
        purchasePrice: 3500000,
        condition: 'good',
        status: 'maintenance',
        location: 'Workshop',
        tenantId: 'default',
      },
    });

    console.log('[Seed] Bikes created:', [
      bike1.model,
      bike2.model,
      bike3.model,
      bike4.model,
      bike5.model,
    ]);

    // Seed Rentals
    const rental1 = await prisma.rental.create({
      data: {
        riderId: rider1.id,
        bikeId: bike1.id,
        checkoutTime: new Date('2026-07-28T08:00:00'),
        returnTime: new Date('2026-07-28T10:30:00'),
        durationHours: 2.5,
        status: 'completed',
        purpose: 'Client meeting',
        tenantId: 'default',
      },
    });

    const rental2 = await prisma.rental.create({
      data: {
        riderId: rider2.id,
        bikeId: bike2.id,
        checkoutTime: new Date('2026-07-28T09:15:00'),
        returnTime: null,
        durationHours: null,
        status: 'active',
        purpose: 'Office commute',
        tenantId: 'default',
      },
    });

    const rental3 = await prisma.rental.create({
      data: {
        riderId: rider3.id,
        bikeId: bike3.id,
        checkoutTime: new Date('2026-07-29T07:30:00'),
        returnTime: new Date('2026-07-29T11:45:00'),
        durationHours: 4.25,
        status: 'completed',
        purpose: 'Site inspection',
        tenantId: 'default',
      },
    });

    const rental4 = await prisma.rental.create({
      data: {
        riderId: rider4.id,
        bikeId: bike4.id,
        checkoutTime: new Date('2026-07-29T13:00:00'),
        returnTime: null,
        durationHours: null,
        status: 'active',
        purpose: 'Field work',
        tenantId: 'default',
      },
    });

    console.log('[Seed] Rentals created:', 4);

    // Seed Maintenance Records
    const maintenance1 = await prisma.maintenance.create({
      data: {
        bikeId: bike1.id,
        maintenanceType: 'Regular Service',
        date: new Date('2026-07-20'),
        description: 'Tune-up dan pembersihan',
        cost: 450000,
        technician: 'Budi Santoso',
        notes: 'Semua komponen OK',
        tenantId: 'default',
      },
    });

    const maintenance2 = await prisma.maintenance.create({
      data: {
        bikeId: bike2.id,
        maintenanceType: 'Tire Replacement',
        date: new Date('2026-07-25'),
        description: 'Penggantian ban depan',
        cost: 350000,
        technician: 'Rudi Hermawan',
        notes: 'Ban lama sudah aus',
        tenantId: 'default',
      },
    });

    const maintenance3 = await prisma.maintenance.create({
      data: {
        bikeId: bike3.id,
        maintenanceType: 'Chain Cleaning',
        date: new Date('2026-07-22'),
        description: 'Pembersihan dan pelumasan rantai',
        cost: 200000,
        technician: 'Budi Santoso',
        notes: 'Rantai dalam kondisi baik',
        tenantId: 'default',
      },
    });

    const maintenance4 = await prisma.maintenance.create({
      data: {
        bikeId: bike5.id,
        maintenanceType: 'Brake Adjustment',
        date: new Date('2026-07-30'),
        description: 'Penyesuaian rem',
        cost: 300000,
        technician: 'Rudi Hermawan',
        notes: 'Rem sudah disesuaikan dan tested',
        tenantId: 'default',
      },
    });

    console.log('[Seed] Maintenance records created:', 4);

    console.log('[Seed] ✅ Database seeding completed successfully!');
    console.log('\n[Seed] Login credentials:');
    console.log('  Admin: admin@sepeda-enterprise.com / Admin@12345');
    console.log('  Manager: manager@sepeda-enterprise.com / User@12345');
    console.log('  Operator: operator@sepeda-enterprise.com / User@12345');
  } catch (error) {
    console.error('[Seed] ❌ Seeding failed:', error);
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