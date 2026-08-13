export function buildPostQuery(input) {
  const page = Number(input.page ?? 1);
  const limit = Number(input.limit ?? 10);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error('page must be a positive integer');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('limit must be an integer between 1 and 100');
  }

  const search = input.search?.trim();
  const where = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
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
