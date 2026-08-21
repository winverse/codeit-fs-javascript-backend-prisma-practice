export const SQL_EXECUTION_TIMEOUT_MS = 5000;

const MAX_SQL_BYTES = 32 * 1024;
const MAX_SQL_STATEMENTS = 16;
const ALLOWED_IDENTIFIERS = new Set([
  'Customers',
  'Products',
  'Purchases',
  'id',
  'email',
  'name',
  'price',
  'customerId',
  'productId',
  'quantity',
]);
const CREATE_WORDS = new Set([
  'CREATE',
  'TABLE',
  'SERIAL',
  'VARCHAR',
  'INTEGER',
  'PRIMARY',
  'KEY',
  'UNIQUE',
  'NOT',
  'NULL',
  'CHECK',
  'DEFAULT',
  'REFERENCES',
]);

function syntaxError() {
  return new Error(
    'Only the CREATE TABLE, INSERT INTO ... VALUES, and simple SELECT ... FROM forms required by this exercise are allowed',
  );
}

function readSingleQuotedValue(sql, start) {
  let index = start + 1;
  while (index < sql.length) {
    if (sql[index] === '\\') {
      throw syntaxError();
    } else if (sql[index] === "'" && sql[index + 1] === "'") {
      index += 2;
    } else if (sql[index] === "'") {
      return index + 1;
    } else {
      index += 1;
    }
  }
  throw syntaxError();
}

function readQuotedIdentifier(sql, start) {
  let value = '';
  let index = start + 1;
  while (index < sql.length) {
    if (sql[index] === '"' && sql[index + 1] === '"') {
      value += '"';
      index += 2;
    } else if (sql[index] === '"') {
      return { nextIndex: index + 1, value };
    } else {
      value += sql[index];
      index += 1;
    }
  }
  throw syntaxError();
}

function readBlockComment(sql, start) {
  let depth = 1;
  let index = start + 2;
  while (index < sql.length && depth > 0) {
    if (sql.startsWith('/*', index)) {
      depth += 1;
      index += 2;
    } else if (sql.startsWith('*/', index)) {
      depth -= 1;
      index += 2;
    } else {
      index += 1;
    }
  }
  if (depth > 0) throw syntaxError();
  return index;
}

function tokenizeStatements(sql) {
  const statements = [];
  let statement = [];
  let index = 0;

  const finishStatement = () => {
    if (statement.length > 0) statements.push(statement);
    statement = [];
  };

  while (index < sql.length) {
    if (/\s/.test(sql[index])) {
      index += 1;
      continue;
    }
    if (sql.startsWith('--', index)) {
      const end = sql.indexOf('\n', index + 2);
      index = end === -1 ? sql.length : end + 1;
      continue;
    }
    if (sql.startsWith('/*', index)) {
      index = readBlockComment(sql, index);
      continue;
    }
    if (sql[index] === "'") {
      index = readSingleQuotedValue(sql, index);
      statement.push({ type: 'value' });
      continue;
    }
    if (sql[index] === '"') {
      const identifier = readQuotedIdentifier(sql, index);
      index = identifier.nextIndex;
      statement.push({ type: 'identifier', value: identifier.value });
      continue;
    }
    const rest = sql.slice(index);
    const word = rest.match(/^[A-Za-z_][A-Za-z0-9_$]*/)?.[0];
    if (word) {
      statement.push({ type: 'word', value: word.toUpperCase() });
      index += word.length;
      continue;
    }
    const number = rest.match(/^-?\d+(?:\.\d+)?/)?.[0];
    if (number) {
      statement.push({ type: 'number', value: number });
      index += number.length;
      continue;
    }
    const operator = ['>=', '<=', '<>', '!='].find((candidate) =>
      sql.startsWith(candidate, index),
    );
    if (operator) {
      statement.push({ type: 'symbol', value: operator });
      index += operator.length;
      continue;
    }
    if ('(),*=<>'.includes(sql[index])) {
      statement.push({ type: 'symbol', value: sql[index] });
      index += 1;
      continue;
    }
    if (sql[index] === ';') {
      finishStatement();
      index += 1;
      continue;
    }
    throw syntaxError();
  }

  finishStatement();
  return statements;
}

function isToken(token, type, value) {
  return token?.type === type && (value === undefined || token.value === value);
}

function assertAllowedIdentifiers(tokens) {
  for (const token of tokens) {
    if (token.type === 'identifier' && !ALLOWED_IDENTIFIERS.has(token.value)) {
      throw syntaxError();
    }
  }
}

function assertCreateTable(tokens) {
  if (
    !isToken(tokens[0], 'word', 'CREATE') ||
    !isToken(tokens[1], 'word', 'TABLE') ||
    !isToken(tokens[2], 'identifier') ||
    !['Customers', 'Products', 'Purchases'].includes(tokens[2].value) ||
    !isToken(tokens[3], 'symbol', '(') ||
    !isToken(tokens.at(-1), 'symbol', ')')
  ) {
    throw syntaxError();
  }

  let depth = 0;
  for (let index = 3; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === 'word' && !CREATE_WORDS.has(token.value)) {
      throw syntaxError();
    }
    if (token.type === 'value') throw syntaxError();
    if (
      token.type === 'symbol' &&
      !['(', ')', ',', '=', '>', '<', '>=', '<=', '<>', '!='].includes(
        token.value,
      )
    ) {
      throw syntaxError();
    }
    if (isToken(token, 'symbol', '(')) depth += 1;
    if (isToken(token, 'symbol', ')')) depth -= 1;
    if (depth < 0 || (depth === 0 && index !== tokens.length - 1)) {
      throw syntaxError();
    }
  }
  if (depth !== 0) throw syntaxError();
}

function assertIdentifierList(tokens, cursor) {
  if (!isToken(tokens[cursor], 'symbol', '(')) throw syntaxError();
  cursor += 1;
  if (!isToken(tokens[cursor], 'identifier')) throw syntaxError();
  let count = 1;
  cursor += 1;
  while (isToken(tokens[cursor], 'symbol', ',')) {
    cursor += 1;
    if (!isToken(tokens[cursor], 'identifier')) throw syntaxError();
    count += 1;
    cursor += 1;
  }
  if (!isToken(tokens[cursor], 'symbol', ')')) throw syntaxError();
  return { count, cursor: cursor + 1 };
}

function isScalar(token) {
  return token?.type === 'number' || token?.type === 'value';
}

function assertValueRow(tokens, cursor) {
  if (!isToken(tokens[cursor], 'symbol', '(')) throw syntaxError();
  cursor += 1;
  if (!isScalar(tokens[cursor])) throw syntaxError();
  let count = 1;
  cursor += 1;
  while (isToken(tokens[cursor], 'symbol', ',')) {
    cursor += 1;
    if (!isScalar(tokens[cursor])) throw syntaxError();
    count += 1;
    cursor += 1;
  }
  if (!isToken(tokens[cursor], 'symbol', ')')) throw syntaxError();
  return { count, cursor: cursor + 1 };
}

function assertInsertValues(tokens) {
  if (
    !isToken(tokens[0], 'word', 'INSERT') ||
    !isToken(tokens[1], 'word', 'INTO') ||
    !isToken(tokens[2], 'identifier') ||
    !['Customers', 'Products', 'Purchases'].includes(tokens[2].value)
  ) {
    throw syntaxError();
  }

  const columns = assertIdentifierList(tokens, 3);
  let { cursor } = columns;
  if (!isToken(tokens[cursor], 'word', 'VALUES')) throw syntaxError();
  let row = assertValueRow(tokens, cursor + 1);
  if (row.count !== columns.count) throw syntaxError();
  cursor = row.cursor;
  while (isToken(tokens[cursor], 'symbol', ',')) {
    row = assertValueRow(tokens, cursor + 1);
    if (row.count !== columns.count) throw syntaxError();
    cursor = row.cursor;
  }
  if (cursor !== tokens.length) throw syntaxError();
}

function assertSelect(tokens) {
  if (!isToken(tokens[0], 'word', 'SELECT')) throw syntaxError();

  let cursor = 1;
  if (isToken(tokens[cursor], 'symbol', '*')) {
    cursor += 1;
  } else {
    if (!isToken(tokens[cursor], 'identifier')) throw syntaxError();
    cursor += 1;
    while (isToken(tokens[cursor], 'symbol', ',')) {
      cursor += 1;
      if (!isToken(tokens[cursor], 'identifier')) throw syntaxError();
      cursor += 1;
    }
  }
  if (!isToken(tokens[cursor], 'word', 'FROM')) throw syntaxError();
  cursor += 1;
  if (
    !isToken(tokens[cursor], 'identifier') ||
    !['Customers', 'Products', 'Purchases'].includes(tokens[cursor].value)
  ) {
    throw syntaxError();
  }
  cursor += 1;
  if (cursor === tokens.length) return;
  if (
    cursor + 4 !== tokens.length ||
    !isToken(tokens[cursor], 'word', 'WHERE') ||
    !isToken(tokens[cursor + 1], 'identifier') ||
    !isToken(tokens[cursor + 2], 'symbol') ||
    !['=', '>', '<', '>=', '<=', '<>', '!='].includes(
      tokens[cursor + 2].value,
    ) ||
    !isScalar(tokens[cursor + 3])
  ) {
    throw syntaxError();
  }
}

export function assertAllowedSqlStatements(sql) {
  if (Buffer.byteLength(sql, 'utf8') > MAX_SQL_BYTES) throw syntaxError();

  const statements = tokenizeStatements(sql);
  if (statements.length === 0 || statements.length > MAX_SQL_STATEMENTS) {
    throw syntaxError();
  }

  for (const tokens of statements) {
    assertAllowedIdentifiers(tokens);
    if (isToken(tokens[0], 'word', 'CREATE')) {
      assertCreateTable(tokens);
    } else if (isToken(tokens[0], 'word', 'INSERT')) {
      assertInsertValues(tokens);
    } else if (isToken(tokens[0], 'word', 'SELECT')) {
      assertSelect(tokens);
    } else {
      throw syntaxError();
    }
  }

  return true;
}
