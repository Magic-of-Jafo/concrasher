import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check role requests
    const roleRequests = await prisma.roleRequest.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            roles: true
          }
        }
      }
    });

    console.log('Role Requests:', JSON.stringify(roleRequests, null, 2));

    // Check users with role requests
    const users = await prisma.user.findMany({
      where: {
        roleRequests: {
          some: {}
        }
      },
      include: {
        roleRequests: true,
        roles: true
      }
    });

    console.log('Users with Role Requests:', JSON.stringify(users, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 