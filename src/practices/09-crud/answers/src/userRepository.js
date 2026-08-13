export function createUserRepository(prisma) {
  return {
    create(data) {
      return prisma.user.create({ data });
    },
    findAll() {
      return prisma.user.findMany({ orderBy: { id: 'asc' } });
    },
    findById(id) {
      return prisma.user.findUnique({ where: { id: Number(id) } });
    },
    update(id, data) {
      return prisma.user.update({ where: { id: Number(id) }, data });
    },
    remove(id) {
      return prisma.user.delete({ where: { id: Number(id) } });
    },
  };
}
