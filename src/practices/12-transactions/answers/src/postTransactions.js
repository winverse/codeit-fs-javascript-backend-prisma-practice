export function createPostTransactions(prisma) {
  return {
    createPostWithComment(post, comment) {
      return prisma.$transaction(async (tx) => {
        const created = await tx.post.create({ data: post });
        await tx.comment.create({ data: { ...comment, postId: created.id } });
        return created;
      });
    },
    deletePostWithComments(postId) {
      return prisma.$transaction(async (tx) => {
        await tx.comment.deleteMany({ where: { postId } });
        return tx.post.delete({ where: { id: postId } });
      });
    },
    createManyPosts(posts) {
      return prisma.$transaction(async (tx) =>
        tx.post.createMany({ data: posts }),
      );
    },
  };
}
