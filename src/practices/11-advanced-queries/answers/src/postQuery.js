export function buildPostQuery(input) {
  const page = Number(input.page) || 1;
  const limit = Number(input.limit) || 10;

  const search = input.search?.trim();
  const where = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      {
        author: {
          is: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      },
    ];
  }
  if (input.published !== undefined) {
    where.published = input.published === true || input.published === 'true';
  }

  return {
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  };
}
