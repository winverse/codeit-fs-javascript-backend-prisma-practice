import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';

function readText(url) {
  return readFileSync(url, 'utf8');
}

function readJson(url) {
  return JSON.parse(readText(url));
}

function tamperJwt(token) {
  const parts = token.split('.');
  const first = parts[1][0];
  parts[1] = `${first === 'a' ? 'b' : 'a'}${parts[1].slice(1)}`;
  return parts.join('.');
}

function createRecordingDelegate(methods) {
  const calls = [];
  const delegate = Object.fromEntries(
    methods.map((method) => [
      method,
      async (args) => {
        calls.push({ method, args });
        return { method, args };
      },
    ]),
  );
  return { calls, delegate };
}

function createTransactionPrisma() {
  const state = { posts: [], comments: [] };
  const tx = {
    post: {
      async create({ data }) {
        const post = { id: state.posts.length + 1, ...data };
        state.posts.push(post);
        return post;
      },
      async delete({ where }) {
        const index = state.posts.findIndex(({ id }) => id === where.id);
        if (index < 0) throw new Error('Post not found');
        return state.posts.splice(index, 1)[0];
      },
      async createMany({ data }) {
        for (const post of data) {
          state.posts.push({ id: state.posts.length + 1, ...post });
        }
        return { count: data.length };
      },
    },
    comment: {
      async create({ data }) {
        if (data.content === 'FAIL') throw new Error('Fixture failure');
        const comment = { id: state.comments.length + 1, ...data };
        state.comments.push(comment);
        return comment;
      },
      async deleteMany({ where }) {
        state.comments = state.comments.filter(
          ({ postId }) => postId !== where.postId,
        );
      },
    },
  };
  return {
    state,
    ...tx,
    async $transaction(callback) {
      const snapshot = structuredClone(state);
      try {
        return await callback(tx);
      } catch (error) {
        state.posts = snapshot.posts;
        state.comments = snapshot.comments;
        throw error;
      }
    },
  };
}

export function registerContracts(candidates) {
  test('01 SQL 기본 사용법', () => {
    const expected = readJson(candidates.sql.fixture);
    const source = readText(candidates.sql.task);
    assert.doesNotMatch(source, /\b(?:PRAGMA|sqlite_master|AUTOINCREMENT)\b/i);
    for (const table of expected.tables) {
      assert.match(source, new RegExp(`CREATE TABLE "${table}" \\(`));
    }
    assert.match(source, /"id" SERIAL PRIMARY KEY/);
    assert.match(source, /"email" VARCHAR\(255\) UNIQUE NOT NULL/);
    assert.match(
      source,
      /"customerId" INTEGER NOT NULL REFERENCES "Customers" \("id"\)/,
    );
    assert.match(
      source,
      /"productId" INTEGER NOT NULL REFERENCES "Products" \("id"\)/,
    );
    assert.match(source, /CHECK \("price" >= 0\)/);
    assert.match(source, /CHECK \("quantity" > 0\)/);
    assert.match(source, /INSERT INTO "Customers"/);
    assert.match(source, /INSERT INTO "Products"/);
    assert.match(source, /INSERT INTO "Purchases"/);
    assert.match(source, /SELECT \* FROM "Products";/);
    assert.match(
      source,
      new RegExp(
        `SELECT \\* FROM "Products" WHERE "price" >= ${expected.minimumPrice};`,
      ),
    );
    assert.match(
      source,
      new RegExp(
        `SELECT \\* FROM "Purchases" WHERE "customerId" = ${expected.customerId};`,
      ),
    );
  });

  test('02 요구사항을 바탕으로 ER 모델링하기', () => {
    const model = readJson(candidates.er.model);
    const fixture = readJson(candidates.er.fixture);
    assert.equal(
      new Set(model.entities.map(({ name }) => name)).size,
      model.entities.length,
    );
    for (const name of fixture.requiredEntities) {
      const entity = model.entities.find(
        (candidate) => candidate.name === name,
      );
      assert.ok(entity, `${name} entity is required`);
      for (const attribute of fixture.requiredAttributes[name]) {
        assert.ok(
          entity.attributes.includes(attribute),
          `${name}.${attribute} is required`,
        );
      }
    }
    assert.deepEqual(
      new Set(model.relationships.map(({ name }) => name)),
      new Set(fixture.requiredRelationshipNames),
    );
  });

  test('03 카디널리티와 Mermaid 사용하기', () => {
    const source = readText(candidates.cardinality.diagram);
    const fixture = readJson(candidates.cardinality.fixture);
    assert.match(source, /^erDiagram/m);
    for (const relation of fixture.relations)
      assert.ok(source.includes(relation));
  });

  test('04 실전 데이터 모델링', () => {
    const source = readText(candidates.modeling.diagram);
    const fixture = readJson(candidates.modeling.fixture);
    for (const entity of fixture.entities) {
      assert.match(source, new RegExp(`\\b${entity}\\s*\\{[\\s\\S]*?\\bPK\\b`));
    }
    for (const relation of fixture.relations)
      assert.ok(source.includes(relation));
    for (const qualified of fixture.uniqueFields) {
      const [entity, field] = qualified.split('.');
      assert.match(
        source,
        new RegExp(`${entity}\\s*\\{[\\s\\S]*?${field}\\s+UK`),
      );
    }
    assert.doesNotMatch(source, /Screening \|\|--\|\{ Ticket/);
  });

  test('05 Prisma 프로젝트 준비', () => {
    const fixture = readJson(candidates.setup.fixture);
    const packageJson = readJson(
      new URL('package.json', candidates.setup.workspace),
    );
    assert.equal(packageJson.type, 'module');
    assert.equal(packageJson.engines.node, '>=26');
    for (const [name, command] of Object.entries(fixture.scripts))
      assert.equal(packageJson.scripts[name], command);
    const output = execFileSync(
      process.execPath,
      [fileURLToPath(new URL('src/server.js', candidates.setup.workspace))],
      { encoding: 'utf8' },
    );
    assert.equal(output.trim(), fixture.stdout);
  });

  test('06 프로젝트 설정', () => {
    const fixture = readJson(candidates.config.fixture);
    for (const valid of fixture.valid) {
      assert.deepEqual(candidates.config.parseConfig(valid), {
        port: Number(valid.PORT),
        databaseUrl: valid.DATABASE_URL,
      });
    }
    for (const invalid of fixture.invalid) {
      assert.throws(() => candidates.config.parseConfig(invalid));
    }
  });

  test('07 Prisma 모델과 관계', () => {
    const source = readText(candidates.schema.schema);
    const fixture = readJson(candidates.schema.fixture);
    for (const model of fixture.models)
      assert.match(source, new RegExp(`model ${model} \\{`));
    for (const token of fixture.requiredTokens)
      assert.ok(source.includes(token));
  });

  test('08 시딩', async () => {
    const fixture = readJson(candidates.seeding.fixture);
    assert.equal(fixture.users.length, 5);
    assert.ok(fixture.users.every(({ posts }) => posts.length >= 1));
    assert.equal(
      candidates.seeding.assertSafeSeedTarget(
        fixture.databaseUrl,
        fixture.resetConfirmation,
        fixture.databaseName,
      ),
      true,
    );
    assert.throws(() =>
      candidates.seeding.assertSafeSeedTarget(
        'postgresql://database.example/prisma_blog',
        fixture.resetConfirmation,
        fixture.databaseName,
      ),
    );
    assert.throws(() =>
      candidates.seeding.assertSafeSeedTarget(
        'postgresql://127.0.0.1/production',
        fixture.resetConfirmation,
        fixture.databaseName,
      ),
    );
    assert.throws(() =>
      candidates.seeding.assertSafeSeedTarget(
        fixture.databaseUrl,
        '--allow-reset=other',
        fixture.databaseName,
      ),
    );

    const calls = [];
    const storedUsers = fixture.users.map(({ email }, index) => ({
      id: index + 1,
      email,
    }));
    const prisma = {
      post: {
        deleteMany() {
          calls.push('post.deleteMany');
          return Promise.resolve({ count: 0 });
        },
        async createMany({ data }) {
          calls.push({ postCreateMany: data });
          return { count: data.length };
        },
      },
      user: {
        deleteMany() {
          calls.push('user.deleteMany');
          return Promise.resolve({ count: 0 });
        },
        async createMany({ data }) {
          calls.push({ userCreateMany: data });
          return { count: data.length };
        },
        async findMany(args) {
          calls.push({ userFindMany: args });
          return storedUsers;
        },
      },
      async $transaction(operations) {
        calls.push({ transactionOperations: operations.length });
        return Promise.all(operations);
      },
    };
    await candidates.seeding.seed(prisma, fixture);
    assert.deepEqual(calls.slice(0, 3), [
      'post.deleteMany',
      'user.deleteMany',
      { transactionOperations: 2 },
    ]);
    const userCreate = calls.find((call) => call.userCreateMany);
    const userFind = calls.find((call) => call.userFindMany);
    const postCreate = calls.find((call) => call.postCreateMany);
    assert.equal(userCreate.userCreateMany.length, fixture.users.length);
    assert.deepEqual(userFind.userFindMany, {
      where: {
        email: { in: fixture.users.map(({ email }) => email) },
      },
      select: { id: true, email: true },
    });
    assert.equal(
      postCreate.postCreateMany.length,
      fixture.users.reduce((count, { posts }) => count + posts.length, 0),
    );
    assert.ok(
      postCreate.postCreateMany.every(({ authorId }) =>
        storedUsers.some(({ id }) => id === authorId),
      ),
    );
  });

  test('09 CRUD', async () => {
    const fixture = readJson(candidates.crud.fixture);
    const { calls, delegate } = createRecordingDelegate([
      'create',
      'findMany',
      'findUnique',
      'update',
      'delete',
    ]);
    const repository = candidates.crud.createUserRepository({ user: delegate });
    await repository.create(fixture.create);
    await repository.findAll();
    await repository.findById(fixture.id);
    await repository.update(fixture.id, fixture.update);
    await repository.remove(fixture.id);
    assert.deepEqual(calls, [
      { method: 'create', args: { data: fixture.create } },
      { method: 'findMany', args: undefined },
      { method: 'findUnique', args: { where: { id: Number(fixture.id) } } },
      {
        method: 'update',
        args: { where: { id: Number(fixture.id) }, data: fixture.update },
      },
      { method: 'delete', args: { where: { id: Number(fixture.id) } } },
    ]);
  });

  test('10 관계 쿼리', async () => {
    const users = createRecordingDelegate(['findMany']);
    const posts = createRecordingDelegate(['findMany']);
    const repository = candidates.relations.createRelationRepository({
      user: users.delegate,
      post: posts.delegate,
    });
    await repository.findUsersWithPosts();
    await repository.findPostsWithAuthors();
    assert.equal(users.calls.length, 1);
    assert.equal(posts.calls.length, 1);
    assert.ok(users.calls[0].args.include.posts);
    assert.deepEqual(posts.calls[0].args.select.author.select, {
      id: true,
      email: true,
      name: true,
    });
  });

  test('11 고급 쿼리', () => {
    const fixture = readJson(candidates.advanced.fixture);
    const query = candidates.advanced.buildPostQuery(fixture.input);
    assert.deepEqual(query, fixture.expected);
    assert.doesNotThrow(() =>
      candidates.advanced.buildPostQuery({ page: '0', limit: '101' }),
    );
  });

  test('12 트랜잭션', async () => {
    const fixture = readJson(candidates.transactions.fixture);
    const prisma = createTransactionPrisma();
    const service = candidates.transactions.createPostTransactions(prisma);
    const created = await service.createPostWithComment(
      fixture.post,
      fixture.comment,
    );
    assert.equal(prisma.state.posts.length, 1);
    assert.equal(prisma.state.comments[0].postId, created.id);
    await assert.rejects(() =>
      service.createPostWithComment(fixture.post, fixture.failingComment),
    );
    assert.equal(prisma.state.posts.length, 1);
    assert.equal(prisma.state.comments.length, 1);
    await service.deletePostWithComments(created.id);
    assert.deepEqual(prisma.state, { posts: [], comments: [] });
    const result = await service.createManyPosts([fixture.post, fixture.post]);
    assert.equal(result.count, 2);
  });

  test('13 인증', async () => {
    const fixture = readJson(candidates.auth.fixture);
    const packageJson = readJson(new URL('../package.json', import.meta.url));
    assert.equal(packageJson.dependencies.bcrypt, '6.0.0');
    assert.equal(packageJson.dependencies.jsonwebtoken, '9.0.3');

    const stored = await candidates.auth.hashPassword(fixture.password);
    assert.notEqual(stored, fixture.password);
    assert.equal(bcrypt.getRounds(stored), 10);
    assert.equal(
      await candidates.auth.comparePassword(fixture.password, stored),
      true,
    );
    assert.equal(
      await candidates.auth.comparePassword(fixture.wrongPassword, stored),
      false,
    );

    const tokens = candidates.auth.generateTokens(
      fixture.user,
      fixture.secrets,
      { access: '1h', refresh: '2h' },
    );
    const accessPayload = candidates.auth.verifyToken(
      tokens.accessToken,
      'access',
      fixture.secrets,
    );
    const refreshPayload = candidates.auth.verifyToken(
      tokens.refreshToken,
      'refresh',
      fixture.secrets,
    );
    assert.equal(accessPayload.userId, fixture.user.id);
    assert.equal(accessPayload.name, fixture.user.name);
    assert.equal(refreshPayload.userId, fixture.user.id);
    assert.equal('name' in refreshPayload, false);
    assert.equal(
      candidates.auth.verifyToken(
        tokens.accessToken,
        'refresh',
        fixture.secrets,
      ),
      null,
    );
    assert.equal(
      candidates.auth.verifyToken(
        tokens.refreshToken,
        'access',
        fixture.secrets,
      ),
      null,
    );
    assert.equal(
      candidates.auth.verifyToken(
        tokens.accessToken,
        'unknown',
        fixture.secrets,
      ),
      null,
    );

    const tamperedAccess = tamperJwt(tokens.accessToken);
    const tamperedRefresh = tamperJwt(tokens.refreshToken);
    const expiredTokens = candidates.auth.generateTokens(
      fixture.user,
      fixture.secrets,
      { access: -1, refresh: -1 },
    );
    assert.equal(
      candidates.auth.verifyToken(undefined, 'access', fixture.secrets),
      null,
    );
    assert.equal(
      candidates.auth.verifyToken(tamperedAccess, 'access', fixture.secrets),
      null,
    );
    assert.equal(
      candidates.auth.verifyToken(
        expiredTokens.accessToken,
        'access',
        fixture.secrets,
      ),
      null,
    );
    assert.equal(
      candidates.auth.verifyToken(undefined, 'refresh', fixture.secrets),
      null,
    );
    assert.equal(
      candidates.auth.verifyToken(tamperedRefresh, 'refresh', fixture.secrets),
      null,
    );
    assert.equal(
      candidates.auth.verifyToken(
        expiredTokens.refreshToken,
        'refresh',
        fixture.secrets,
      ),
      null,
    );

    const cookieCalls = [];
    const clearCalls = [];
    const cookieResponse = {
      cookie(name, value, options) {
        cookieCalls.push({ name, value, options });
      },
      clearCookie(name, options) {
        clearCalls.push({ name, options });
      },
    };
    candidates.auth.setAuthCookies(cookieResponse, tokens, {
      secure: fixture.cookie.secure,
    });
    candidates.auth.clearAuthCookies(cookieResponse, {
      secure: fixture.cookie.secure,
    });
    const baseCookieOptions = {
      httpOnly: true,
      secure: fixture.cookie.secure,
      sameSite: 'lax',
      path: '/',
    };
    assert.deepEqual(cookieCalls, [
      {
        name: 'accessToken',
        value: tokens.accessToken,
        options: {
          ...baseCookieOptions,
          maxAge: fixture.cookie.accessMaxAge,
        },
      },
      {
        name: 'refreshToken',
        value: tokens.refreshToken,
        options: {
          ...baseCookieOptions,
          maxAge: fixture.cookie.refreshMaxAge,
        },
      },
    ]);
    assert.deepEqual(clearCalls, [
      { name: 'accessToken', options: baseCookieOptions },
      { name: 'refreshToken', options: baseCookieOptions },
    ]);

    const publicUser = candidates.auth.toPublicUser(fixture.user);
    assert.equal('password' in publicUser, false);

    const runAuthentication = (accessToken) => {
      const request = { cookies: accessToken ? { accessToken } : {} };
      let nextCalled = false;
      const response = {
        statusCode: 200,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };
      candidates.auth.authenticate(fixture.secrets)(request, response, () => {
        nextCalled = true;
      });
      return { request, response, nextCalled };
    };

    const authenticated = runAuthentication(tokens.accessToken);
    assert.equal(authenticated.nextCalled, true);
    assert.equal(authenticated.request.user.userId, fixture.user.id);

    for (const rejectedToken of [
      undefined,
      tamperedAccess,
      expiredTokens.accessToken,
    ]) {
      const rejected = runAuthentication(rejectedToken);
      assert.equal(rejected.nextCalled, false);
      assert.equal(rejected.response.statusCode, 401);
      assert.equal(typeof rejected.response.body.message, 'string');
    }
  });

  test('14 유효성 검사', () => {
    const fixture = readJson(candidates.validation.fixture);
    assert.equal(
      candidates.validation.signupSchema.safeParse(fixture.validSignup).success,
      true,
    );
    for (const invalid of fixture.invalidSignup) {
      assert.equal(
        candidates.validation.signupSchema.safeParse(invalid).success,
        false,
      );
    }
    assert.equal(
      candidates.validation.loginSchema.safeParse(fixture.validLogin).success,
      true,
    );
    for (const invalid of fixture.invalidLogin) {
      assert.equal(
        candidates.validation.loginSchema.safeParse(invalid).success,
        false,
      );
    }
    for (const password of ['a'.repeat(15), 'a'.repeat(72), '가'.repeat(24)]) {
      assert.equal(
        candidates.validation.signupSchema.safeParse({
          ...fixture.validSignup,
          password,
        }).success,
        true,
      );
      assert.equal(
        candidates.validation.loginSchema.safeParse({
          ...fixture.validLogin,
          password,
        }).success,
        true,
      );
    }
    for (const password of ['a'.repeat(73), '가'.repeat(25)]) {
      assert.equal(
        candidates.validation.signupSchema.safeParse({
          ...fixture.validSignup,
          password,
        }).success,
        false,
      );
      assert.equal(
        candidates.validation.loginSchema.safeParse({
          ...fixture.validLogin,
          password,
        }).success,
        false,
      );
    }
    for (const password of ['a'.repeat(14), '😀'.repeat(8)]) {
      assert.equal(
        candidates.validation.signupSchema.safeParse({
          ...fixture.validSignup,
          password,
        }).success,
        false,
      );
    }
    assert.equal(
      candidates.validation.signupSchema.safeParse({
        ...fixture.validSignup,
        password: '😀'.repeat(15),
      }).success,
      true,
    );
    const signupWithUnknownField = candidates.validation.signupSchema.safeParse(
      {
        ...fixture.validSignup,
        role: 'admin',
      },
    );
    assert.equal(signupWithUnknownField.success, true);
    assert.deepEqual(signupWithUnknownField.data, fixture.validSignup);
  });

  test('15 커스텀 에러와 검증 리팩터링', () => {
    const fixture = readJson(candidates.errors.fixture);
    for (const value of fixture.valid) {
      const req = { params: { id: value } };
      let nextValue;
      candidates.errors.validateIdParam('id', '게시글')(req, {}, (error) => {
        nextValue = error ?? null;
      });
      assert.equal(nextValue, null);
      assert.equal(req.params.id, Number(value));
    }
    for (const value of fixture.invalid) {
      const req = { params: { id: value } };
      let captured;
      candidates.errors.validateIdParam('id', '게시글')(req, {}, (error) => {
        captured = error;
      });
      assert.ok(captured instanceof candidates.errors.HttpError);
      assert.equal(captured.status, 400);
    }
    const handleError = (error) => {
      const response = {
        statusCode: 200,
        body: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };
      candidates.errors.errorHandler(error, {}, response, () => {});
      return response;
    };

    const customResponse = handleError(
      new candidates.errors.HttpError(404, 'Not found'),
    );
    assert.equal(customResponse.statusCode, 404);
    assert.deepEqual(customResponse.body, { message: 'Not found' });

    let notFoundError;
    candidates.errors.notFoundHandler({}, {}, (error) => {
      notFoundError = error;
    });
    assert.ok(notFoundError instanceof candidates.errors.HttpError);
    assert.equal(notFoundError.status, 404);
    const notFoundResponse = handleError(notFoundError);
    assert.equal(notFoundResponse.statusCode, 404);
    assert.deepEqual(notFoundResponse.body, { message: 'Not found' });

    for (const [statusProperty, status] of [
      ['status', 400],
      ['statusCode', 413],
    ]) {
      const internalMessage = `Internal ${status} details`;
      const error = new Error(internalMessage);
      error[statusProperty] = status;
      const clientResponse = handleError(error);
      assert.equal(clientResponse.statusCode, status);
      assert.deepEqual(clientResponse.body, { message: 'Bad request' });
      assert.notEqual(clientResponse.body.message, internalMessage);
    }

    const internalMessage = 'Database credentials leaked';
    const unexpectedResponse = handleError(new Error(internalMessage));
    assert.equal(unexpectedResponse.statusCode, 500);
    assert.deepEqual(unexpectedResponse.body, {
      message: 'Internal server error',
    });
    assert.notEqual(unexpectedResponse.body.message, internalMessage);
  });
}
