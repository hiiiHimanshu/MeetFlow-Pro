import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: { email: 'demo@example.com', name: 'Demo' }
  });
  const ws = await prisma.workspace.create({ data: { name: 'Demo Workspace', ownerId: user.id, members: { create: { userId: user.id, role: 'OWNER' } } } });
  console.log({ user, workspace: ws });
}

main().finally(async () => prisma.$disconnect());
