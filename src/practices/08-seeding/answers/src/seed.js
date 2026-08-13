export function assertSafeSeedTarget(databaseUrl, confirmation, databaseName) {
  const target = new URL(databaseUrl);
  const actualDatabase = target.pathname.slice(1);
  const localHost = ['127.0.0.1', 'localhost', '::1'].includes(target.hostname);
  const confirmed = confirmation === `--allow-reset=${databaseName}`;

  if (!localHost || actualDatabase !== databaseName || !confirmed) {
    throw new Error('Refusing to reset a database outside the practice target');
  }
  return true;
}

export async function seed(prisma, fixture) {
  assertSafeSeedTarget(
    fixture.databaseUrl,
    fixture.resetConfirmation,
    fixture.databaseName,
  );

  await prisma.$transaction([
    prisma.post.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const userData = fixture.users.map(({ posts: _posts, ...user }) => user);
  await prisma.user.createMany({ data: userData });
  const users = await prisma.user.findMany({
    where: { email: { in: userData.map(({ email }) => email) } },
    select: { id: true, email: true },
  });
  const idsByEmail = new Map(users.map(({ email, id }) => [email, id]));
  const postData = fixture.users.flatMap((user) =>
    user.posts.map((post) => ({
      ...post,
      authorId: idsByEmail.get(user.email),
    })),
  );
  await prisma.post.createMany({ data: postData });
}
