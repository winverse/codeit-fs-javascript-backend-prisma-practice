const maskSegment = (segment) => segment.replace(/[^\r\n]/g, ' ');

function maskSqlLiteralsAndComments(sql) {
  let masked = '';
  let index = 0;

  while (index < sql.length) {
    if (sql.startsWith('--', index)) {
      const end = sql.indexOf('\n', index + 2);
      const nextIndex = end === -1 ? sql.length : end;
      masked += maskSegment(sql.slice(index, nextIndex));
      index = nextIndex;
      continue;
    }

    if (sql.startsWith('/*', index)) {
      let depth = 1;
      let nextIndex = index + 2;
      while (nextIndex < sql.length && depth > 0) {
        if (sql.startsWith('/*', nextIndex)) {
          depth += 1;
          nextIndex += 2;
        } else if (sql.startsWith('*/', nextIndex)) {
          depth -= 1;
          nextIndex += 2;
        } else {
          nextIndex += 1;
        }
      }
      masked += maskSegment(sql.slice(index, nextIndex));
      index = nextIndex;
      continue;
    }

    if (sql[index] === "'") {
      const previous = sql[index - 1];
      const beforePrevious = sql[index - 2];
      const escapeString =
        (previous === 'E' || previous === 'e') &&
        !/[A-Za-z0-9_$]/.test(beforePrevious ?? '');
      let nextIndex = index + 1;
      while (nextIndex < sql.length) {
        if (escapeString && sql[nextIndex] === '\\') {
          nextIndex += 2;
        } else if (sql[nextIndex] === "'" && sql[nextIndex + 1] === "'") {
          nextIndex += 2;
        } else if (sql[nextIndex] === "'") {
          nextIndex += 1;
          break;
        } else {
          nextIndex += 1;
        }
      }
      masked += maskSegment(sql.slice(index, nextIndex));
      index = nextIndex;
      continue;
    }

    if (sql[index] === '"') {
      let nextIndex = index + 1;
      while (nextIndex < sql.length) {
        if (sql[nextIndex] === '"' && sql[nextIndex + 1] === '"') {
          nextIndex += 2;
        } else if (sql[nextIndex] === '"') {
          nextIndex += 1;
          break;
        } else {
          nextIndex += 1;
        }
      }
      masked += maskSegment(sql.slice(index, nextIndex));
      index = nextIndex;
      continue;
    }

    if (sql[index] === '$') {
      const delimiter = sql
        .slice(index)
        .match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0];
      if (delimiter) {
        const closingIndex = sql.indexOf(delimiter, index + delimiter.length);
        const nextIndex =
          closingIndex === -1 ? sql.length : closingIndex + delimiter.length;
        masked += maskSegment(sql.slice(index, nextIndex));
        index = nextIndex;
        continue;
      }
    }

    masked += sql[index];
    index += 1;
  }

  return masked;
}

export function assertAllowedSqlStatements(sql) {
  const statements = maskSqlLiteralsAndComments(sql)
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    if (!/^(?:CREATE\s+TABLE|INSERT\s+INTO|SELECT)\b/i.test(statement)) {
      throw new Error(
        'Only CREATE TABLE, INSERT INTO, and SELECT statements are allowed',
      );
    }
  }

  return true;
}
